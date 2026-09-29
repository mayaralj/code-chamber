// hooks/usePageTitle.js
import { useEffect } from "react";

// Custom hook to set the page title and append Code Chamber to it
const usePageTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} — Code Chamber` : "Code Chamber";
  }, [title]);
};

export default usePageTitle;
