// Data normalization utilities

export const normalizeUser = (doc = {}) => ({
  _id: doc._id?.toString(),
  email: doc.email,
  fname: doc.fname,
  mname: doc.mname,
  lname: doc.lname,
  name: [doc.fname, doc.mname, doc.lname].filter(Boolean).join(' '),
  role: 'user',
  contactNumber: doc.contactNumber || '',
  addresses: doc.addresses || (Array.isArray(doc.address) ? doc.address : [])
})

export const normalizeAdmin = (doc = {}) => ({
  _id: doc._id?.toString(),
  email: doc.email,
  username: doc.username,
  fname: doc.fname,
  mname: doc.mname || '',
  lname: doc.lname,
  name: [doc.fname, doc.mname, doc.lname].filter(Boolean).join(' '),
  role: doc.role || 'admin'
})
