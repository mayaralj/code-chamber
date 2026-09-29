// Imports
import { NavLink } from "react-router";
import usePageTitle from "../hooks/usePageTitle";

// Not found page
const NotFound = () => {
  // Page Title
  usePageTitle("Page Not Found");
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0b0b] font-mono text-[#e7c49d] flex items-center justify-center px-6">
      <div className="mx-auto w-full max-w-md text-center">
        {/* Card, same dotted texture as ActionCard */}
        <div className="border border-[#4b4133] bg-[#111111] p-10 [background-image:radial-gradient(#5b4e3e_0.7px,transparent_0.7px)] [background-size:14.1px_14.1px]">
          <div className="flex items-center justify-center">
            <span className="border border-[#9e8968] px-2 py-1 text-[10px] font-bold tracking-widest text-[#d8c09d]">
              ERROR
            </span>
          </div>

          <h1 className="mt-6 text-7xl font-black tracking-tight text-[#ffedd1]">
            404
          </h1>

          <p className="mt-4 text-sm font-bold tracking-[0.08em] text-[#fcdca9]">
            URL NOT FOUND.
          </p>

          <p className="mt-4 text-[15px] leading-7 text-[#c7b499]">
            This page doesn't exist.
          </p>

          <NavLink
            to="/"
            className="mt-8 inline-block w-full cursor-pointer border border-[#ffd99d] bg-[#ffd99d] py-4 text-xs font-black tracking-widest text-[#1a1712] transition-colors duration-200 hover:bg-[#e7bc76]"
          >
            RETURN HOME ›
          </NavLink>

          <p className="mt-6 text-[10px] font-bold tracking-[0.18em] text-[#564b3c]">
            STANDARD PAGE PROTOCOL ACTIVE
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
