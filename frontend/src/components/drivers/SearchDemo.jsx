import React, { useState } from "react";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Search } from "lucide-react";

const SearchDemo = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Sample data with drivers having multiple vehicles
  const sampleDrivers = [
    {
      _id: "1",
      plateNo: ["ABC-1234", "XYZ-5678", "DEF-9012"],
      ownerRepresentativeName: "JOHN DOE",
      municipality: "CITY OF MATI",
      barangay: "DAHICAN"
    },
    {
      _id: "2", 
      plateNo: ["GHI-3456"],
      ownerRepresentativeName: "JANE SMITH",
      municipality: "LUPON",
      barangay: "ILANGAY"
    },
    {
      _id: "3",
      plateNo: ["JKL-7890", "MNO-2468"],
      ownerRepresentativeName: "BOB WILSON",
      municipality: "CITY OF MATI", 
      barangay: "DAHICAN"
    }
  ];

  // Filter drivers based on search term
  const filteredDrivers = sampleDrivers.filter(driver => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in driver name
    const nameMatch = driver.ownerRepresentativeName.toLowerCase().includes(searchLower);
    
    // Search in municipality
    const municipalityMatch = driver.municipality.toLowerCase().includes(searchLower);
    
    // Search in barangay
    const barangayMatch = driver.barangay.toLowerCase().includes(searchLower);
    
    // Search in ALL plate numbers
    const plateNoArray = Array.isArray(driver.plateNo) ? driver.plateNo : [driver.plateNo];
    const plateMatch = plateNoArray.some(plate => 
      plate.toLowerCase().includes(searchLower)
    );
    
    return nameMatch || municipalityMatch || barangayMatch || plateMatch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Search Functionality Demo</h2>
        <p className="text-sm text-gray-600">
          This demonstrates how the search works with drivers who have multiple vehicles.
          Try searching for any plate number, name, or location.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search drivers, plate numbers, locations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Search Results</h3>
          <Badge variant="outline">
            {filteredDrivers.length} driver{filteredDrivers.length !== 1 ? 's' : ''} found
          </Badge>
        </div>

        {filteredDrivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No drivers found matching "{searchTerm}"
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDrivers.map((driver) => {
              const plateNoArray = Array.isArray(driver.plateNo) ? driver.plateNo : [driver.plateNo];
              const vehicleCount = plateNoArray.length;
              
              return (
                <div key={driver._id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{driver.ownerRepresentativeName}</h4>
                    {vehicleCount > 1 && (
                      <Badge variant="secondary">
                        {vehicleCount} vehicles
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {driver.municipality}, {driver.barangay}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Plate Numbers:</div>
                    <div className="flex flex-wrap gap-2">
                      {plateNoArray.map((plate, index) => (
                        <Badge 
                          key={index} 
                          variant="outline"
                          className={plate.toLowerCase().includes(searchTerm.toLowerCase()) ? "bg-blue-100 border-blue-300" : ""}
                        >
                          {plate}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {vehicleCount > 1 && (
                    <div className="mt-2 text-xs text-blue-600">
                      💡 Click to expand and see all vehicle details
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search Examples */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Try searching for:</h4>
        <div className="flex flex-wrap gap-2 text-sm">
          <button 
            onClick={() => setSearchTerm("ABC-1234")}
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            ABC-1234
          </button>
          <button 
            onClick={() => setSearchTerm("JOHN")}
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            JOHN
          </button>
          <button 
            onClick={() => setSearchTerm("MATI")}
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            MATI
          </button>
          <button 
            onClick={() => setSearchTerm("XYZ")}
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            XYZ
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchDemo;
