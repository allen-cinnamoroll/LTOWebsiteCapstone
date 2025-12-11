import mongoose from 'mongoose';

const userLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  logType: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'register', 'update', 'delete', 'password_change', 'password_reset', 'password_reset_otp_sent', 'password_reset_otp_verified', 'otp_sent', 'otp_verified', 'otp_reset', 'profile_update', 'add_driver', 'add_vehicle', 'add_accident', 'add_violation', 'update_driver', 'update_vehicle', 'update_accident', 'update_violation', 'delete_driver', 'delete_vehicle', 'delete_accident', 'delete_violation', 'restore_driver', 'restore_vehicle', 'restore_accident', 'restore_violation', 'permanent_delete_driver', 'permanent_delete_vehicle', 'permanent_delete_accident', 'permanent_delete_violation', 'automatic_retrain_accident', 'automatic_retrain_mv_registration', 'manual_retrain_accident_model', 'cancel_retrain_accident_model', 'retrain_completed_accident_model']
  },
  ipAddress: {
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
  timestamps: false
});

// Index for better query performance
userLogSchema.index({ userId: 1, timestamp: -1 });
userLogSchema.index({ logType: 1, timestamp: -1 });

export default mongoose.model('UserLog', userLogSchema);
