import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Siren } from "lucide-react";

const PageNotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <h1 className="font-bold text-[80px] md:text-[100px] lg:text-[300px] text-muted-foreground leading-none">404</h1>
      <p className="text-lg mb-5">Oops... Page not found.</p>
      <Button variant="outline" size="lg" onClick={() => navigate("/")}>
        Go to Home
      </Button>
    </div>
  );
};

export default PageNotFound;
