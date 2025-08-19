import React, { useState, useEffect } from "react";
import logo from "@/assets/lto.svg";
import { Button } from "../ui/button";
import { ArrowBigRight, ArrowDownRight } from "lucide-react";
import { ModeToggle } from "@/components/theme/mode-toggle";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  // Detect scroll and update state
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`h-[60px] w-full flex justify-between top-0 left-0 fixed z-50 transition-all duration-300 px-5 lg:px-32 ${
        // isScrolled ? "bg-zinc/30 backdrop-blur-md shadow-md" : "bg-transparent"
        isScrolled ? "bg-primary shadow-md" : ""
      }`}
    >
      <div className="h-full flex items-center gap-2 text-secondary-foreground text-sm font-medium ">
        {/* <Button
          variant="link"
          className="md:h-full md:w-60 text-secondary-foreground"
          onClick={() => {
            document.getElementById("home").scrollIntoView({
              behavior: "smooth",
            });
          }}
        > */}
          <img src={logo} alt="" className="size-10 " />
          Land Transportation Office
        {/* </Button> */}
        {/* <div className="h-full hidden md:inline">
          <Button
            size="lg"
            variant="link"
            className="hover:no-underline h-full text-black hover:bg-deepBlue hover:text-white rounded-none"
            onClick={() => {
              document.getElementById("features").scrollIntoView({
                behavior: "smooth",
              });
            }}
          >
            Features
            <ArrowDownRight />
          </Button>
        </div> */}
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
      </div>
    </header>
  );
};

export default Header;
