import mongoose from 'mongoose';

const userLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['0', '1', '2'] // 0: Superadmin, 1: Admin, 2: Employee
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  actorName: {
    type: String,
    required: false
  },
  actorEmail: {
    type: String,
    required: false
  },
  actorRole: {
    type: String,
    required: false,
    enum: ['0', '1', '2']
  },
  logType: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'register', 'update', 'delete', 'password_change', 'password_reset', 'password_reset_otp_sent', 'password_reset_otp_verified', 'otp_sent', 'otp_verified', 'otp_reset', 'profile_update', 'add_driver', 'add_vehicle', 'add_accident', 'add_violation', 'update_driver', 'update_vehicle', 'update_accident', 'update_violation', 'delete_driver', 'delete_vehicle', 'delete_accident', 'delete_violation']
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'failed', 'pending']
  },
  details: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
userLogSchema.index({ userId: 1, timestamp: -1 });
userLogSchema.index({ email: 1, timestamp: -1 });
userLogSchema.index({ role: 1, timestamp: -1 });
userLogSchema.index({ logType: 1, timestamp: -1 });

export default mongoose.model('UserLog', userLogSchema);
