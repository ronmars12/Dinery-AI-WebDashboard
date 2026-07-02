import React from "react";
import Dashboard from "./dashboard/Dashboard";
import Restaurant from "./restaurant/Restaurant";
import Offers from "./offers/Offers";
import CRM from "./CRM/CRM";
import ReservationSoftware from "./ReservationSoftware/ReservationSoftware";
import AccountSettings from "./account/AccountSettings";
import TableManagement from "./TablePage/TableManagement";
import ReservationLinkPage from "./ReservationLinks/Reservationlinkpage";
import EmployeeManagement from "./Timesheets/EmployeeManagement";

export default function MainContent({ activeItem, selectedRestaurant }) {
  const fullScreenStyles = "flex-1 h-full overflow-y-auto bg-gray-50";

  switch (activeItem) {
    case "Dashboard":
      return (
        <div className={fullScreenStyles}>
          <div className="min-h-full flex flex-col">
            <Dashboard />
          </div>
        </div>
      );

    case "Restaurant":
      return (
        <div className={fullScreenStyles}>
          <div className="min-h-full flex flex-col">
            <Restaurant />
          </div>
        </div>
      );

    case "Offers":
      return (
        <div className={fullScreenStyles}>
          <div className="min-h-full flex flex-col">
            <Offers />
          </div>
        </div>
      );

    case "CRM":
      return (
        <div className={fullScreenStyles}>
          <div className="min-h-full flex flex-col">
            <CRM />
          </div>
        </div>
      );

    case "Reservation Software":
      return (
        <div className={fullScreenStyles}>
          <div className="min-h-full flex flex-col">
            <ReservationSoftware />
          </div>
        </div>
      );

    case "Table Management":
      return (
        <div className={fullScreenStyles}>
          <div className="min-h-full flex flex-col">
            <TableManagement />
          </div>
        </div>
      );

    case "Reservation Link":
      return (
        <div className={fullScreenStyles}>
          <div className="min-h-full flex flex-col">
            <ReservationLinkPage selectedRestaurant={selectedRestaurant} />
          </div>
        </div>
      );

    case "Timesheet":
      return (
        <div className="flex-1 h-full overflow-hidden flex flex-col">
          <EmployeeManagement />
        </div>
      );

    case "Account Settings":
      return (
        <div className={fullScreenStyles}>
          <div className="min-h-full flex flex-col">
            <AccountSettings />
          </div>
        </div>
      );

    default:
      return (
        <div className={`${fullScreenStyles} flex items-center justify-center`}>
          <div className="p-6 text-center">
            <div className="bg-white p-8 rounded-lg shadow-sm max-w-md mx-auto">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <h2 className="mt-4 text-xl font-medium text-gray-700">
                Select a menu item to begin
              </h2>
              <p className="mt-2 text-gray-500">
                Choose an option from the sidebar to get started
              </p>
            </div>
          </div>
        </div>
      );
  }
}