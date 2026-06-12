const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
  password: { type: String, required: true },
  friendCode: { type: String, unique: true },
  friends: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String
  }]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.friendCode) {
    this.friendCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
