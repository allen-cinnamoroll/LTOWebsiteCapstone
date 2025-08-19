"use client";
import { Outlet } from "react-router-dom";
import React from "react";
import  Header  from "../components/nav/Header";

const MainLayout = () => {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
};

export default MainLayout;
