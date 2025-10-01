import React from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronDown, ChevronRight, Car } from "lucide-react";

// Demo component showing different approaches for displaying drivers with multiple vehicles
const DriverTableDemo = () => {
  // Sample data with drivers having multiple vehicles
  const sampleDrivers = [
    {
      _id: "1",
      plateNo: ["ABC-1234", "XYZ-5678", "DEF-9012"],
      ownerRepresentativeName: "JOHN DOE",
      municipality: "CITY OF MATI",
      barangay: "DAHICAN",
      hasDriversLicense: true,
      driversLicenseNumber: "DL123456789"
    },
    {
      _id: "2", 
      plateNo: ["GHI-3456"],
      ownerRepresentativeName: "JANE SMITH",
      municipality: "LUPON",
      barangay: "ILANGAY",
      hasDriversLicense: false
    },
    {
      _id: "3",
      plateNo: ["JKL-7890", "MNO-2468"],
      ownerRepresentativeName: "BOB WILSON",
      municipality: "CITY OF MATI", 
      barangay: "DAHICAN",
      hasDriversLicense: true,
      driversLicenseNumber: "DL987654321"
    }
  ];

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Driver Table Display Solutions</h1>
      
      {/* Approach 1: Enhanced Plate Number Display */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Approach 1: Enhanced Plate Number Display</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Plate No.</th>
                <th className="px-4 py-2 text-left">Owner</th>
                <th className="px-4 py-2 text-left">Municipality</th>
                <th className="px-4 py-2 text-left">License</th>
              </tr>
            </thead>
            <tbody>
              {sampleDrivers.map((driver) => {
                const plateNoArray = Array.isArray(driver.plateNo) ? driver.plateNo : [driver.plateNo];
                const vehicleCount = plateNoArray.length;
                
                return (
                  <tr key={driver._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {plateNoArray.slice(0, 2).map((plate, index) => (
                          <div key={index} className="font-medium text-sm">
                            {plate}
                          </div>
                        ))}
                        {vehicleCount > 2 && (
                          <div className="text-xs text-blue-600 font-medium">
                            +{vehicleCount - 2} more
                          </div>
                        )}
                        {vehicleCount > 1 && (
                          <div className="text-xs text-gray-500">
                            {vehicleCount} vehicle{vehicleCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{driver.ownerRepresentativeName}</td>
                    <td className="px-4 py-3">{driver.municipality}</td>
                    <td className="px-4 py-3">
                      {driver.hasDriversLicense ? (
                        <div>
                          <div className="font-semibold text-green-600 text-sm">Yes</div>
                          <div className="text-xs text-gray-500">{driver.driversLicenseNumber}</div>
                        </div>
                      ) : (
                        <div className="font-semibold text-red-600 text-sm">No</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approach 2: Vehicle Count Column */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Approach 2: Vehicle Count Column</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Plate No.</th>
                <th className="px-4 py-2 text-left">Vehicles</th>
                <th className="px-4 py-2 text-left">Owner</th>
                <th className="px-4 py-2 text-left">Municipality</th>
                <th className="px-4 py-2 text-left">License</th>
              </tr>
            </thead>
            <tbody>
              {sampleDrivers.map((driver) => {
                const plateNoArray = Array.isArray(driver.plateNo) ? driver.plateNo : [driver.plateNo];
                const vehicleCount = plateNoArray.length;
                
                return (
                  <tr key={driver._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{plateNoArray[0]}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={vehicleCount > 1 ? "default" : "secondary"} 
                          className="text-xs"
                        >
                          {vehicleCount}
                        </Badge>
                        {vehicleCount > 1 && (
                          <span className="text-xs text-gray-500">
                            vehicles
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{driver.ownerRepresentativeName}</td>
                    <td className="px-4 py-3">{driver.municipality}</td>
                    <td className="px-4 py-3">
                      {driver.hasDriversLicense ? (
                        <div>
                          <div className="font-semibold text-green-600 text-sm">Yes</div>
                          <div className="text-xs text-gray-500">{driver.driversLicenseNumber}</div>
                        </div>
                      ) : (
                        <div className="font-semibold text-red-600 text-sm">No</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approach 3: Expandable Rows */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Approach 3: Expandable Rows (Recommended)</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Plate No.</th>
                <th className="px-4 py-2 text-left">Owner</th>
                <th className="px-4 py-2 text-left">Municipality</th>
                <th className="px-4 py-2 text-left">License</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sampleDrivers.map((driver) => {
                const plateNoArray = Array.isArray(driver.plateNo) ? driver.plateNo : [driver.plateNo];
                const vehicleCount = plateNoArray.length;
                const hasMultipleVehicles = vehicleCount > 1;
                
                return (
                  <React.Fragment key={driver._id}>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {hasMultipleVehicles && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          )}
                          <div className="font-medium">{plateNoArray[0]}</div>
                          {hasMultipleVehicles && (
                            <Badge variant="secondary" className="text-xs">
                              +{vehicleCount - 1} more
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{driver.ownerRepresentativeName}</td>
                      <td className="px-4 py-3">{driver.municipality}</td>
                      <td className="px-4 py-3">
                        {driver.hasDriversLicense ? (
                          <div>
                            <div className="font-semibold text-green-600 text-sm">Yes</div>
                            <div className="text-xs text-gray-500">{driver.driversLicenseNumber}</div>
                          </div>
                        ) : (
                          <div className="font-semibold text-red-600 text-sm">No</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </td>
                    </tr>
                    {/* Expanded row would go here */}
                    {hasMultipleVehicles && (
                      <tr className="bg-gray-50">
                        <td colSpan="5" className="px-4 py-4">
                          <div className="bg-white p-4 rounded-lg border">
                            <div className="flex items-center gap-2 mb-3">
                              <Car className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium">
                                All Vehicles ({vehicleCount})
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {plateNoArray.map((plate, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                                  <div className="font-medium text-sm">{plate}</div>
                                  <div className="text-xs text-gray-500">Vehicle #{index + 1}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Recommendations:</h3>
        <ul className="space-y-2 text-sm">
          <li><strong>Approach 1 (Enhanced Plate Display):</strong> Good for quick scanning, shows multiple plates with truncation</li>
          <li><strong>Approach 2 (Vehicle Count Column):</strong> Clean and simple, easy to sort by vehicle count</li>
          <li><strong>Approach 3 (Expandable Rows):</strong> Best user experience, shows all details without cluttering the main view</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">
          <strong>Recommended:</strong> Use Approach 3 (Expandable Rows) for the best user experience, 
          or Approach 2 (Vehicle Count Column) for a simpler implementation.
        </p>
      </div>
    </div>
  );
};

export default DriverTableDemo;
