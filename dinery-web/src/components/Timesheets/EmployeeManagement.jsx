import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore as db } from "../../firebase";
import TimesheetPage from "./TimesheetPage";
import AddUserPage   from "./AddUserPage";

export default function EmployeeManagement() {
  const [page, setPage]               = useState("list");
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) { console.log("❌ No user logged in"); return; }

    const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
    const isStaff = !!staffRestaurantId;

    // ── Staff: use restaurantId directly from sessionStorage ─────────
    if (isStaff) {
      console.log("✅ Staff restaurantId:", staffRestaurantId);
      setRestaurantId(staffRestaurantId);
      return;
    }

    // ── Owner: query by Owner_ID ──────────────────────────────────────
    import("firebase/firestore").then(({ collection, query, where, getDocs }) => {
      getDocs(query(
        collection(db, "restaurants"),
        where("Owner_ID", "==", user.uid)
      )).then((snap) => {
        if (!snap.empty) {
          const restaurantDocId = snap.docs[0].id;
          console.log("✅ Found restaurantId:", restaurantDocId);
          setRestaurantId(restaurantDocId);
        } else {
          console.log("❌ No restaurant found for Owner_ID:", user.uid);
        }
      });
    });
  }, []);

  if (page === "add") {
    return <AddUserPage onBack={() => setPage("list")} restaurantId={restaurantId} />;
  }

  return <TimesheetPage onAddUser={() => setPage("add")} restaurantId={restaurantId} />;
}