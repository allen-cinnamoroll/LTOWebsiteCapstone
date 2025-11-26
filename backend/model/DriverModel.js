import OwnerModel from './OwnerModel.js';

// Simple compatibility wrapper:
// Older scripts (import_any_json, import_restructured_data, etc.)
// still import '../model/DriverModel.js'. Instead of rewriting all
// those scripts, we re-export the current owner model here so that
// those imports keep working.
//
// Anywhere that previously used DriverModel will now operate on the
// same MongoDB collection/schema as OwnerModel ("Owners").

export default OwnerModel;


