import { createClient } from '@supabase/supabase-js'
import { ObjectId } from 'mongodb'
import logger from '../utils/logger.mjs'

const DEFAULT_TABLE_NAME = 'app_documents'

let client = null
let db = null
let tableName = DEFAULT_TABLE_NAME

const cloneValue = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value))
}

const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof ObjectId)

const normalizeForStorage = (value) => {
  if (value instanceof ObjectId) return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeForStorage)
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalizeForStorage(nested)])
    )
  }
  return value
}

const normalizeForCompare = (value) => {
  if (value instanceof ObjectId) return value.toString()
  if (value instanceof Date) return value.getTime()
  return value
}

const valuesEqual = (left, right) => {
  const l = normalizeForCompare(left)
  const r = normalizeForCompare(right)
  return l === r
}

const toDateTimestamp = (value) => {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

const greaterOrEqual = (left, right) => {
  const leftDate = toDateTimestamp(left)
  const rightDate = toDateTimestamp(right)
  if (leftDate !== null && rightDate !== null) {
    return leftDate >= rightDate
  }
  return Number(left) >= Number(right)
}

const getValuesByPath = (source, path) => {
  const parts = path.split('.')

  const walk = (current, index) => {
    if (index >= parts.length) return [current]
    if (current === null || current === undefined) return [undefined]

    if (Array.isArray(current)) {
      return current.flatMap((item) => walk(item, index))
    }

    return walk(current[parts[index]], index + 1)
  }

  return walk(source, 0)
}

const matchesField = (document, fieldPath, expected) => {
  const values = getValuesByPath(document, fieldPath)

  if (isPlainObject(expected)) {
    if ('$ne' in expected) {
      return values.every((value) => !valuesEqual(value, expected.$ne))
    }

    if ('$gte' in expected) {
      return values.some((value) => greaterOrEqual(value, expected.$gte))
    }

    if ('$elemMatch' in expected) {
      return values.some((value) => {
        if (!Array.isArray(value)) return false
        return value.some((item) => matchesQuery(item, expected.$elemMatch))
      })
    }
  }

  return values.some((value) => valuesEqual(value, expected))
}

const matchesQuery = (document, query = {}) => {
  if (!query || Object.keys(query).length === 0) return true

  for (const [key, value] of Object.entries(query)) {
    if (key === '$or') {
      if (!Array.isArray(value) || !value.some((clause) => matchesQuery(document, clause))) {
        return false
      }
      continue
    }

    if (key === '$and') {
      if (!Array.isArray(value) || !value.every((clause) => matchesQuery(document, clause))) {
        return false
      }
      continue
    }

    if (!matchesField(document, key, value)) return false
  }

  return true
}

const sortDocuments = (documents, sortSpec = {}) => {
  const sortEntries = Object.entries(sortSpec)
  if (sortEntries.length === 0) return documents

  return [...documents].sort((left, right) => {
    for (const [field, direction] of sortEntries) {
      const [leftValue] = getValuesByPath(left, field)
      const [rightValue] = getValuesByPath(right, field)
      const l = normalizeForCompare(leftValue)
      const r = normalizeForCompare(rightValue)
      if (l === r) continue
      const base = l > r ? 1 : -1
      return direction >= 0 ? base : -base
    }
    return 0
  })
}

const setByPath = (target, path, value) => {
  const parts = path.split('.')
  let current = target

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index]
    const next = parts[index + 1]
    const keyIsIndex = /^\d+$/.test(key)
    const nextIsIndex = /^\d+$/.test(next)

    if (keyIsIndex) {
      const numericKey = Number(key)
      if (!Array.isArray(current)) current = []
      if (current[numericKey] === undefined) {
        current[numericKey] = nextIsIndex ? [] : {}
      }
      current = current[numericKey]
      continue
    }

    if (!isPlainObject(current[key]) && !Array.isArray(current[key])) {
      current[key] = nextIsIndex ? [] : {}
    }
    current = current[key]
  }

  const finalKey = parts[parts.length - 1]
  if (/^\d+$/.test(finalKey)) {
    current[Number(finalKey)] = value
  } else {
    current[finalKey] = value
  }
}

const getByPath = (source, path) => {
  const parts = path.split('.')
  let current = source
  for (const key of parts) {
    if (current === null || current === undefined) return undefined
    current = current[key]
  }
  return current
}

const applyPull = (array, criteria) =>
  array.filter((item) => !matchesQuery(item, criteria))

const resolvePositionalPath = (document, filter, path) => {
  if (!path.includes('.$')) return path

  const marker = '.$'
  const markerIndex = path.indexOf(marker)
  const arrayField = path.slice(0, markerIndex)
  const remaining = path.slice(markerIndex + marker.length)
  const arrayValue = document[arrayField]

  if (!Array.isArray(arrayValue) || arrayValue.length === 0) {
    return null
  }

  const subFilters = Object.entries(filter)
    .filter(([key]) => key.startsWith(`${arrayField}.`))
    .map(([key, value]) => [key.slice(arrayField.length + 1), value])

  let elementIndex = 0
  if (subFilters.length > 0) {
    elementIndex = arrayValue.findIndex((item) =>
      subFilters.every(([subPath, expected]) => matchesField(item, subPath, expected))
    )
  }

  if (elementIndex < 0) return null
  if (!remaining || remaining === '.') return `${arrayField}.${elementIndex}`
  if (remaining.startsWith('.')) return `${arrayField}.${elementIndex}${remaining}`
  return `${arrayField}.${elementIndex}.${remaining}`
}

const applyUpdate = (document, update = {}, filter = {}) => {
  const next = cloneValue(document)

  if (update.$set) {
    for (const [rawPath, value] of Object.entries(update.$set)) {
      const resolvedPath = resolvePositionalPath(next, filter, rawPath)
      if (!resolvedPath) continue
      setByPath(next, resolvedPath, normalizeForStorage(value))
    }
  }

  if (update.$inc) {
    for (const [rawPath, amount] of Object.entries(update.$inc)) {
      const resolvedPath = resolvePositionalPath(next, filter, rawPath)
      if (!resolvedPath) continue
      const current = Number(getByPath(next, resolvedPath) ?? 0)
      setByPath(next, resolvedPath, current + Number(amount))
    }
  }

  if (update.$push) {
    for (const [path, value] of Object.entries(update.$push)) {
      const current = getByPath(next, path)
      const safeArray = Array.isArray(current) ? [...current] : []
      safeArray.push(normalizeForStorage(value))
      setByPath(next, path, safeArray)
    }
  }

  if (update.$pull) {
    for (const [path, criteria] of Object.entries(update.$pull)) {
      const current = getByPath(next, path)
      if (!Array.isArray(current)) continue
      setByPath(next, path, applyPull(current, criteria))
    }
  }

  return next
}

const applyProjection = (document, projection = {}) => {
  if (!projection || Object.keys(projection).length === 0) return document

  const projected = { _id: document._id }
  for (const [field, rule] of Object.entries(projection)) {
    if (isPlainObject(rule) && rule.$elemMatch) {
      const sourceArray = document[field]
      if (Array.isArray(sourceArray)) {
        const match = sourceArray.find((item) => matchesQuery(item, rule.$elemMatch))
        projected[field] = match ? [match] : []
      }
      continue
    }

    if (rule) {
      projected[field] = document[field]
    }
  }

  return projected
}

class SupabaseCursor {
  constructor(collection, query = {}) {
    this.collection = collection
    this.query = query
    this.sortSpec = {}
  }

  sort(spec = {}) {
    this.sortSpec = spec
    return this
  }

  async toArray() {
    const documents = await this.collection._findDocuments(this.query)
    return sortDocuments(documents, this.sortSpec).map((doc) => cloneValue(doc))
  }
}

class SupabaseCollection {
  constructor(name) {
    this.name = name
  }

  async _readRows() {
    const rows = []
    const pageSize = 1000
    let offset = 0

    while (true) {
      const { data, error } = await client
        .from(tableName)
        .select('id, document')
        .eq('collection', this.name)
        .range(offset, offset + pageSize - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      rows.push(...data)
      if (data.length < pageSize) break
      offset += pageSize
    }

    return rows
  }

  _hydrate(row) {
    const document = cloneValue(row.document || {})
    return { ...document, _id: row.id }
  }

  async _findDocuments(query = {}) {
    const rows = await this._readRows()
    const documents = rows.map((row) => this._hydrate(row))
    return documents.filter((document) => matchesQuery(document, query))
  }

  async _saveDocument(id, document) {
    const toStore = normalizeForStorage({ ...document })
    delete toStore._id

    const { error } = await client
      .from(tableName)
      .update({
        document: toStore,
        updated_at: new Date().toISOString()
      })
      .eq('collection', this.name)
      .eq('id', id)

    if (error) throw error
  }

  find(query = {}) {
    return new SupabaseCursor(this, query)
  }

  async findOne(query = {}, options = {}) {
    const documents = await this._findDocuments(query)
    if (documents.length === 0) return null
    return applyProjection(cloneValue(documents[0]), options.projection)
  }

  async insertOne(document = {}) {
    const id = normalizeForStorage(document._id ?? new ObjectId().toString())
    const toStore = normalizeForStorage({ ...document })
    delete toStore._id

    const now = new Date().toISOString()
    const { error } = await client.from(tableName).insert({
      collection: this.name,
      id,
      document: toStore,
      created_at: now,
      updated_at: now
    })

    if (error) throw error
    return { insertedId: id }
  }

  async updateOne(filter = {}, update = {}, options = {}) {
    const documents = await this._findDocuments(filter)
    const first = documents[0]

    if (!first) {
      if (options.upsert) {
        const base = {}
        for (const [key, value] of Object.entries(filter)) {
          if (key.startsWith('$')) continue
          if (isPlainObject(value)) continue
          setByPath(base, key, normalizeForStorage(value))
        }
        const upserted = applyUpdate(base, {
          $set: update.$set || {},
          $inc: update.$inc || {},
          $push: update.$push || {},
          $pull: update.$pull || {}
        }, filter)
        if (update.$setOnInsert) {
          for (const [path, value] of Object.entries(update.$setOnInsert)) {
            setByPath(upserted, path, normalizeForStorage(value))
          }
        }
        const { insertedId } = await this.insertOne(upserted)
        return {
          matchedCount: 0,
          modifiedCount: 0,
          upsertedCount: 1,
          upsertedId: insertedId
        }
      }

      return { matchedCount: 0, modifiedCount: 0 }
    }

    const updated = applyUpdate(first, update, filter)
    await this._saveDocument(first._id, updated)
    return { matchedCount: 1, modifiedCount: 1 }
  }

  async updateMany(filter = {}, update = {}) {
    const documents = await this._findDocuments(filter)
    let modifiedCount = 0

    for (const document of documents) {
      const updated = applyUpdate(document, update, filter)
      await this._saveDocument(document._id, updated)
      modifiedCount += 1
    }

    return { matchedCount: documents.length, modifiedCount }
  }

  async deleteOne(filter = {}) {
    const documents = await this._findDocuments(filter)
    const first = documents[0]
    if (!first) return { deletedCount: 0 }

    const { error } = await client
      .from(tableName)
      .delete()
      .eq('collection', this.name)
      .eq('id', first._id)

    if (error) throw error
    return { deletedCount: 1 }
  }

  async deleteMany(filter = {}) {
    const documents = await this._findDocuments(filter)
    if (documents.length === 0) return { deletedCount: 0 }

    const ids = documents.map((document) => document._id)
    const { error } = await client
      .from(tableName)
      .delete()
      .eq('collection', this.name)
      .in('id', ids)

    if (error) throw error
    return { deletedCount: ids.length }
  }

  async countDocuments(filter = {}) {
    const documents = await this._findDocuments(filter)
    return documents.length
  }

  aggregate(pipeline = []) {
    const run = async () => {
      let documents = await this._findDocuments({})

      for (const stage of pipeline) {
        if (stage.$match) {
          documents = documents.filter((document) => matchesQuery(document, stage.$match))
        } else if (stage.$group) {
          const groupById = stage.$group._id
          const groups = new Map()

          let extractKey
          if (groupById === null) {
            extractKey = () => null
          } else if (typeof groupById === 'string' && groupById.startsWith('$')) {
            const fieldName = groupById.slice(1)
            extractKey = (doc) => {
              const [val] = getValuesByPath(doc, fieldName)
              return val ?? 'null'
            }
          } else if (isPlainObject(groupById) && groupById.$dateToString) {
            const fieldName = groupById.$dateToString.date.replace(/^\$/, '')
            extractKey = (doc) => {
              const [val] = getValuesByPath(doc, fieldName)
              if (!val) return 'null'
              const d = new Date(val)
              if (Number.isNaN(d.getTime())) return 'null'
              // Default to YYYY-MM-DD
              return d.toISOString().split('T')[0]
            }
          } else {
            extractKey = () => 'null'
          }

          for (const doc of documents) {
            const groupKey = extractKey(doc)
            if (!groups.has(groupKey)) {
              groups.set(groupKey, { _id: groupKey })
            }
            const group = groups.get(groupKey)
            
            for (const [opKey, op] of Object.entries(stage.$group)) {
              if (opKey === '_id') continue
              if (op.$sum) {
                const current = Number(group[opKey] || 0)
                if (op.$sum === 1) {
                  group[opKey] = current + 1
                } else if (typeof op.$sum === 'string' && op.$sum.startsWith('$')) {
                  const sumField = op.$sum.slice(1)
                  const [val] = getValuesByPath(doc, sumField)
                  group[opKey] = current + Number(val || 0)
                }
              }
            }
          }
          documents = Array.from(groups.values())
        } else if (stage.$sort) {
          documents = sortDocuments(documents, stage.$sort)
        } else if (stage.$limit) {
          documents = documents.slice(0, stage.$limit)
        } else if (stage.$project) {
          documents = documents.map(doc => {
            const projected = {}
            for (const [key, value] of Object.entries(stage.$project)) {
              if (value === 1) {
                // If it's a rename (like status: '$_id' in the original query)
                // but the original query was { status: '$_id', count: 1, _id: 0 }
                // In our case doc._id is the group key.
                projected[key] = doc[key] ?? doc._id
              } else if (typeof value === 'string' && value.startsWith('$')) {
                const sourceField = value.slice(1)
                projected[key] = doc[sourceField] ?? (sourceField === '_id' ? doc._id : undefined)
              }
            }
            return projected
          })
        }
      }

      return documents.map((document) => cloneValue(document))
    }

    return { toArray: run }
  }

  async findOneAndUpdate(filter = {}, update = {}, options = {}) {
    const before = await this.findOne(filter)
    await this.updateOne(filter, update, { upsert: options.upsert })

    if (options.returnDocument === 'before') {
      return before
    }

    return this.findOne(filter)
  }
}

export const connectDatabase = async () => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  tableName = process.env.SUPABASE_DB_TABLE || DEFAULT_TABLE_NAME

  if (!url || !key) {
    const error = new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
    logger.error('Database configuration error', error)
    throw error
  }

  try {
    logger.info('Connecting to Supabase database...')
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    db = { provider: 'supabase', tableName }
    logger.success('Connected to Supabase database successfully', { tableName })
    return db
  } catch (error) {
    logger.error('Failed to connect to Supabase database', error, { tableName })
    throw error
  }
}

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase first.')
  }
  return db
}

export const getCollections = () => {
  getDatabase()
  const createCollection = (name) => new SupabaseCollection(name)
  return {
    users: createCollection('users'),
    admins: createCollection('admins'),
    products: createCollection('products'),
    orders: createCollection('orders'),
    banners: createCollection('marketing_banners'),
    carts: createCollection('carts'),
    settings: createCollection('settings'),
    notifications: createCollection('notifications'),
    password_resets: createCollection('password_resets')
  }
}

export const closeDatabase = async () => {
  if (client) {
    logger.info('Closing database connection...')
    client = null
    db = null
    logger.success('Database connection closed')
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await closeDatabase()
  process.exit(0)
})
