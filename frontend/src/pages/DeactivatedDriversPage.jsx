import React, { useState, useEffect } from "react";
import { deactivatedDriverColumns } from "@/components/table/columns";
import TableComponent from "@/components/table/TableComponent";
import { toast } from "sonner";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import { createCategoryMap } from "@/util/helper";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";

const sexMap = createCategoryMap({
  0: "Male",
  1: "Female",
});

const civilStatusMap = createCategoryMap({
  0: "Single",
  1: "Married",
  3: "Divorced",
});

const DeactivatedDriversPage = () => {
  const [driverData, setDriverData] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [currentDriver, setCurrentDriver] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data } = await apiClient.get("/driver", {
        headers: {
          Authorization: token,
        },
      });

      const driverData = data.data.map((dData) => ({
        _id: dData._id,
        licenseNo: dData.licenseNo,
        fullname: dData.fullname,
        birthDate: formatSimpleDate(dData.birthDate),
        issueDate: formatSimpleDate(dData.issueDate),
        expiryDate: formatSimpleDate(dData.expiryDate),
        sex: sexMap.get(dData.sex),
        civilStatus: civilStatusMap.get(dData.civilStatus),
        isActive: dData.isActive,
      }));

      const deactivatedDrivers = driverData.filter(
        (data) => data.isActive === false
      );
      setDriverData(deactivatedDrivers);

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log(error);
    }
  };

  const handleActivate = (data) => {
    setShowAlert(true);
    setCurrentDriver(data);
  };

  const confirmActivate = () => {
    onActivate(true); // Call the activate function
    setShowAlert(false); // Close the alert dialog after action
  };

  const cancelActivate = () => {
    setShowAlert(false); // Close the alert dialog
  };

  const onActivate = async (data) => {
    const promise = async () => {
      try {
        const response = await apiClient.patch(
          `/driver/${currentDriver}/updateStatus`,
          {
            isActive: data,
          },
          {
            headers: {
              Authorization: token,
            },
          }
        );

        return response.data; // Resolve with data for toast success message
      } catch (error) {
        const message = error.response?.data?.message || "An error occurred";
        throw new Error(message); // Reject with error for toast error message
      } finally {
       await fetchDrivers();
      }
    };

    toast.promise(promise(), {
      loading: "Loading...",
      success: `Driver activated`,
      error: (error) => error.message || "Failed to update driver",
    });
  };
  return (
    <div className="p-4">
      <header className="text-xl md:text-3xl font-bold mb-5">
        Deleted Drivers
      </header>
      <div className=" pt-4 md:px-0 md:pt-0">
        <Button
          variant="outline"
          className="shadow-none"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft /> Back
        </Button>
      </div>

      <section>
        <TableComponent
          data={driverData}
          searchPlaceholder={"Search Driver..."}
          filters={["fullname", "licenseNo"]}
          tableColumn={deactivatedDriverColumns}
          loading={loading}
          onAction={handleActivate}
        />
      </section>
      <ConfirmationDIalog
        open={showAlert}
        onOpenChange={setShowAlert}
        cancel={cancelActivate}
        confirm={confirmActivate}
        title={"Are you sure?"}
        description={
          "This action cannot be undone. This will activate the driver."
        }
      />
    </div>
  );
};

export default DeactivatedDriversPage;
