import React, { useEffect, useState, useMemo } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore, collection, query, where,
  onSnapshot, doc, getDoc, orderBy, getDocs,
} from "firebase/firestore";
import { useAnalytics } from "../../hooks/useAnalytics";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, Legend, LineChart, Line, ComposedChart,
  RadialBarChart, RadialBar, ScatterChart, Scatter, ZAxis,
} from "recharts";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  orange:  "#fe8a24",
  orange2: "#ffb366",
  green:   "#34d399",
  blue:    "#60a5fa",
  purple:  "#a78bfa",
  yellow:  "#fbbf24",
  red:     "#f87171",
  slate:   "#94a3b8",
  teal:    "#2dd4bf",
  pink:    "#f472b6",
  emerald: "#10b981",
  cyan:    "#06b6d4",
  rose:    "#fb7185",
  amber:   "#f59e0b",
};
const STATUS_COLORS = { confirmed:C.green, pending:C.yellow, cancelled:C.red, completed:C.blue };
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const toDate  = (v) => v?.toDate?.() || (v ? new Date(v) : null);
const fmtPct  = (n,t) => t>0 ? `${((n/t)*100).toFixed(1)}%` : "0%";
const fmt     = (d,o) => d?.toLocaleDateString("en-US",o) || "";
const fmtDur  = (m) => { if(!m||m<1) return "—"; const h=Math.floor(m/60),r=Math.round(m%60); return h>0?`${h}h ${r}m`:`${r}m`; };
const pad2    = (n) => String(n).padStart(2,"0");
const localDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

const safeInt = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number" && isFinite(v) && v < 1e10) return Math.round(v);
  if (typeof v === "string") { const n = parseInt(v); return isFinite(n) ? n : 0; }
  return 0;
};
const fmtNum = (n) => {
  const x = safeInt(n);
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 10_000)    return `${(x / 1_000).toFixed(1)}k`;
  return x.toLocaleString();
};

// ── Periods ──
const PERIODS = [
  { key:"this_week",  label:"This week"  },
  { key:"prev_week",  label:"Last week"  },
  { key:"this_month", label:"This month" },
  { key:"this_year",  label:"This year"  },  // Changed from "prev_month" to "this_year"
  { key:"custom",     label:"Custom"     },
];

const getPeriodRange = (key) => {
  const now=new Date();
  const s=(d)=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
  const e=(d)=>{const x=new Date(d);x.setHours(23,59,59,999);return x;};
  switch(key){
    case "this_week":  {const ws=new Date(now);ws.setDate(now.getDate()-((now.getDay()+6)%7));return[s(ws),e(now)];}
    case "prev_week":  {const ws=new Date(now);ws.setDate(now.getDate()-((now.getDay()+6)%7)-7);const we=new Date(ws);we.setDate(ws.getDate()+6);return[s(ws),e(we)];}
    case "this_month": return[s(new Date(now.getFullYear(),now.getMonth(),1)),e(now)];
    case "this_year":  return[s(new Date(now.getFullYear(),0,1)),e(now)];  // January 1st of current year to today
    default: return[s(now),e(now)];
  }
};

// ── Shared tooltip ────────────────────────────────────────────────────────────
const CTip = ({ active, payload, label }) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:"#1e293b",borderRadius:10,padding:"8px 12px",boxShadow:"0 8px 24px rgba(0,0,0,0.3)"}}>
      <p style={{fontSize:11,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>{label}</p>
      {payload.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
          <span style={{width:6,height:6,borderRadius:"50%",backgroundColor:p.color||p.fill,display:"inline-block",flexShrink:0}}/>
          <span style={{fontSize:11,color:"#94a3b8"}}>{p.name}:</span>
          <span style={{fontSize:11,fontWeight:700,color:"#f1f5f9"}}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Donut ─────────────────────────────────────────────────────────────────────
const DonutChart = ({ data, total, label }) => {
  const [active,setActive]=useState(null);
  const d=active!==null?data[active]:null;
  return (
    <div style={{position:"relative",width:170,height:170,flexShrink:0}}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name"
            cx="50%" cy="50%" innerRadius={52} outerRadius={76}
            paddingAngle={2} startAngle={90} endAngle={-270}
            onMouseEnter={(_,i)=>setActive(i)} onMouseLeave={()=>setActive(null)}>
            {data.map((entry,i)=>(
              <Cell key={i} fill={entry.color} opacity={active===null||active===i?1:0.2} stroke="transparent"/>
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        <span style={{fontSize:19,fontWeight:900,color:"#111827",lineHeight:1}}>{d?d.value:total}</span>
        <span style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.1em",marginTop:3}}>{d?d.name:label}</span>
      </div>
    </div>
  );
};

const DonutLegend = ({ data, total }) => (
  <div style={{display:"flex",flexDirection:"column",gap:8,justifyContent:"center",flex:1,minWidth:0}}>
    {data.map((d,i)=>(
      <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:7,height:7,borderRadius:"50%",backgroundColor:d.color,flexShrink:0}}/>
        <span style={{fontSize:12,color:"#6b7280",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textTransform:"capitalize"}}>{d.name}</span>
        <span style={{fontSize:12,fontWeight:700,color:"#111827",flexShrink:0}}>{d.value}</span>
        <span style={{fontSize:10,color:"#94a3b8",width:34,textAlign:"right",flexShrink:0}}>{fmtPct(d.value,total)}</span>
      </div>
    ))}
  </div>
);

// ── Card ──────────────────────────────────────────────────────────────────────
const Card = ({ title, subtitle, badge, children, style={} }) => (
  <div style={{background:"#fff",borderRadius:14,border:"1px solid #f1f5f9",padding:"18px 20px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",...style}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:subtitle?4:14}}>
      <p style={{fontSize:13,fontWeight:700,color:"#374151",fontStyle:"italic",margin:0,flex:1}}>{title}</p>
      {badge&&<span style={{fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:20,background:badge.bg,color:badge.color,textTransform:"uppercase",letterSpacing:"0.08em"}}>{badge.label}</span>}
    </div>
    {subtitle&&<p style={{fontSize:11,color:"#94a3b8",marginBottom:14,marginTop:0}}>{subtitle}</p>}
    {children}
  </div>
);

// ── Section divider ───────────────────────────────────────────────────────────
const Divider = ({ label, icon }) => (
  <div style={{display:"flex",alignItems:"center",gap:10,margin:"22px 0 10px"}}>
    {icon&&<span style={{fontSize:14}}>{icon}</span>}
    <span style={{fontSize:9,fontWeight:800,color:"#cbd5e1",textTransform:"uppercase",letterSpacing:"0.14em",whiteSpace:"nowrap"}}>{label}</span>
    <div style={{flex:1,height:1,background:"#f1f5f9"}}/>
  </div>
);

const axisStyle = { fontSize:11, fill:"#94a3b8" };
const gridProps = { strokeDasharray:"3 3", stroke:"#f1f5f9", vertical:false };

// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Section
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsSection({ restaurants }) {
  const firestore=getFirestore();
  const user=getAuth().currentUser;
  const [period,        setPeriod]        = useState("this_month");
  const [customStart,   setCustomStart]   = useState("");
  const [customEnd,     setCustomEnd]     = useState("");
  const [search,        setSearch]        = useState("");
  const [custSort,      setCustSort]      = useState("visits");
  const [selRestaurant, setSelRestaurant] = useState("all");
  const [activeTab,     setActiveTab]     = useState("reservations");

  // ── Compute date range first — must be before useAnalytics hook ──
  const [rangeStart, rangeEnd] = useMemo(() => {
    if(period==="custom"&&customStart&&customEnd){
      const s=new Date(customStart);s.setHours(0,0,0,0);
      const e=new Date(customEnd);  e.setHours(23,59,59,999);
      return[s,e];
    }
    if(period==="custom") return[null,null];
    return getPeriodRange(period);
  },[period,customStart,customEnd]);

  // ── Analytics hook — reads precomputed aggregate docs instead of raw reservations ──
  const analyticsRestaurantId = selRestaurant === "all"
      ? (restaurants[0]?.id || null)
      : selRestaurant;

  const {
      kpis:             analyticsKpis,
      statusData:       analyticsStatusData,
      originData:       analyticsOriginData,
      arrivalData:      analyticsArrivalData,
      createdPerHour:   analyticsCreatedPerHour,
      bookingsPerGuest: analyticsBookingsPerGuest,
      weekdayData:      analyticsWeekdayData,
      leadTimeData:     analyticsLeadTimeData,
      loading:          analyticsLoading,
  } = useAnalytics({
      restaurantId: analyticsRestaurantId,
      rangeStart,
      rangeEnd,
      enabled: !!rangeStart && !!rangeEnd,
  });

  // ── Scoped reservations fetch — only for detailed views (heatmap, customer table etc.) ──
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
      if (!rangeStart || !rangeEnd || !user || !analyticsRestaurantId) {
          setReservations([]);
          return;
      }
      let cancelled = false;
      const fetchReservations = async () => {
          try {
            // Staff use the restaurant's Owner_ID, not their own uid
            const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
            const isStaff = !!staffRestaurantId;
            const ownerUid = isStaff
              ? (restaurants[0]?.Owner_ID || user.uid)
              : user.uid;

            const q = query(
              collection(firestore, "reservations"),
              where("restaurant_owner_id", "==", ownerUid),
              where("reservation_date", ">=", rangeStart),
              where("reservation_date", "<=", rangeEnd),
              orderBy("reservation_date", "asc")
            );
              const snap = await getDocs(q);
              console.log("Sources:", [...new Set(snap.docs.map(d => d.data().source))], "isWalkin:", [...new Set(snap.docs.map(d => d.data().is_walkin))]);
              if (!cancelled) {
                  let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                  if (selRestaurant !== "all") {
                      data = data.filter(r => r.restaurant_id === selRestaurant);
                  }
                  setReservations(data);
              }
          } catch (err) {
              console.error("Reservations fetch error:", err);
              setReservations([]);
          }
      };
      fetchReservations();
      return () => { cancelled = true; };
  }, [rangeStart?.getTime(), rangeEnd?.getTime(), user?.uid, selRestaurant, analyticsRestaurantId]);

  // ✅ MOVED HERE - after reservations state is declared
  const repeatStats = useMemo(() => {
      const map = {};
      reservations.forEach(r => {
          const k = (r.customer_name || "").trim() + (r.customer_phone || "").trim();
          if (k.length > 0) map[k] = (map[k] || 0) + 1;
      });
      const totalCustomers  = Object.keys(map).length;
      const repeatCustomers = Object.values(map).filter(v => v > 1).length;
      const repeatRate      = totalCustomers > 0
          ? ((repeatCustomers / totalCustomers) * 100).toFixed(1)
          : "0";
      return { totalCustomers, repeatCustomers, repeatRate };
  }, [reservations]);

  // ✅ MOVED HERE - after repeatStats
  const kpis = {
      total:           analyticsKpis?.total          || 0,
      confirmed:       analyticsKpis?.confirmed       || 0,
      cancelled:       analyticsKpis?.cancelled       || 0,
      pending:         analyticsKpis?.pending         || 0,
      completed:       analyticsKpis?.completed       || 0,
      totalG:          analyticsKpis?.totalGuests     || 0,
      noShow:          analyticsKpis?.noShows         || 0,
      avgG:            analyticsKpis?.avgG            || "0",
      avgDur:          analyticsKpis?.avgDur          || 0,
      noShowRate:      analyticsKpis?.noShowRate      || "0",
      cancelRate:      analyticsKpis?.cancelRate      || "0",
      repeatRate:      repeatStats?.repeatRate      || "0",
      totalCustomers:  repeatStats?.totalCustomers  || 0,
      repeatCustomers: repeatStats?.repeatCustomers || 0,
  };
  const statusData      = analyticsStatusData      || [];
  const originData      = analyticsOriginData      || [];
  const arrivalData     = analyticsArrivalData     || [];
  const createdPerHour  = analyticsCreatedPerHour  || [];
  const bookingsPerGuest= analyticsBookingsPerGuest|| [];
  const weekdayData     = analyticsWeekdayData     || [];
  const leadTimeData    = analyticsLeadTimeData    || [];

  useEffect(() => {
    if (!rangeStart || !rangeEnd || !user || !analyticsRestaurantId) {
      setReservations([]);
      return;
    }
    let cancelled = false;
    const fetchReservations = async () => {
      try {
      // Staff use the restaurant's Owner_ID, not their own uid
        const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
        const isStaff = !!staffRestaurantId;
        const ownerUid = isStaff
          ? (restaurants[0]?.Owner_ID || user.uid)
          : user.uid;

        const q = query(
          collection(firestore, "reservations"),
          where("restaurant_owner_id", "==", ownerUid),
          where("reservation_date", ">=", rangeStart),
          where("reservation_date", "<=", rangeEnd),
          orderBy("reservation_date", "asc")
        );
        const snap = await getDocs(q);
        console.log("Sources:", [...new Set(snap.docs.map(d => d.data().source))], "isWalkin:", [...new Set(snap.docs.map(d => d.data().is_walkin))]);
        if (!cancelled) {
          let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (selRestaurant !== "all") {
            data = data.filter(r => r.restaurant_id === selRestaurant);
          }
          setReservations(data);
        }
      } catch (err) {
        console.error("Reservations fetch error:", err);
        setReservations([]);
      }
    };
    fetchReservations();
    return () => { cancelled = true; };
  }, [rangeStart?.getTime(), rangeEnd?.getTime(), user?.uid, selRestaurant, analyticsRestaurantId]);

  // Dinery App specific state
  const [menuItems,     setMenuItems]     = useState([]);
  const [orders,        setOrders]        = useState([]);
  const [reviews,       setReviews]       = useState([]);
  const [loyaltyUsers,  setLoyaltyUsers]  = useState([]);

    useEffect(()=>{
      if(!user||!restaurants||restaurants.length===0) return;
      const restaurantIds=restaurants.map(r=>r.id).filter(Boolean);
      if(restaurantIds.length===0) return;

      const menuUnsub=onSnapshot(
        query(collection(firestore,"menu_items"),where("restaurant_owner_id","==",user.uid)),
        snap=>setMenuItems(snap.docs.map(d=>({id:d.id,...d.data()})))
      );
      const ordersUnsub=onSnapshot(
        query(collection(firestore,"orders"),where("restaurant_id","in",restaurantIds)),
        snap=>setOrders(snap.docs.map(d=>({id:d.id,...d.data()})))
      );
      const reviewsUnsub=onSnapshot(
        query(collection(firestore,"reviews"),where("restaurant_id","in",restaurantIds)),
        snap=>setReviews(snap.docs.map(d=>({id:d.id,...d.data()})))
      );
      const loyaltyUnsub=onSnapshot(
        query(collection(firestore,"loyalty_users"),where("restaurant_id","in",restaurantIds)),
        snap=>setLoyaltyUsers(snap.docs.map(d=>({id:d.id,...d.data()})))
      );
      return()=>{menuUnsub();ordersUnsub();reviewsUnsub();loyaltyUnsub();};
    },[user,firestore,restaurants]);

  // Filter dinery app data by selected restaurant
  const filteredOrders = useMemo(() => {
    if(selRestaurant === "all") return orders;
    return orders.filter(o => o.restaurant_id === selRestaurant);
  }, [orders, selRestaurant]);

  const filteredReviews = useMemo(() => {
    if(selRestaurant === "all") return reviews;
    return reviews.filter(r => r.restaurant_id === selRestaurant);
  }, [reviews, selRestaurant]);

  const filteredLoyalty = useMemo(() => {
    if(selRestaurant === "all") return loyaltyUsers;
    return loyaltyUsers.filter(l => l.restaurant_id === selRestaurant);
  }, [loyaltyUsers, selRestaurant]);

  

  // ── Dinery App KPIs ──
  const dineryKpis=useMemo(()=>{
    // Dinery App reservations = those with mobile/online source
    const appRes=reservations.filter(r=>
      r.source==="mobile_app"||r.source==="dinery_app"||
      r.source==="reservation_link"||r.is_walkin===false&&r.source
    );
    const totalBookings=appRes.length;
    const confirmed=appRes.filter(r=>r.status==="confirmed"||r.status==="completed").length;
    const pending=appRes.filter(r=>r.status==="pending").length;
    const cancelled=appRes.filter(r=>r.status==="cancelled").length;
    const totalGuests=appRes.reduce((s,r)=>s+safeInt(r.number_of_guests),0);
    const avgParty=totalBookings>0?(totalGuests/totalBookings).toFixed(1):"0";
    const withMenuItems=appRes.filter(r=>r.selected_menu_items?.length>0).length;
    const menuRate=totalBookings>0?((withMenuItems/totalBookings)*100).toFixed(1):"0";
    const withReq=appRes.filter(r=>r.special_requests?.trim()).length;
    const reqRate=totalBookings>0?((withReq/totalBookings)*100).toFixed(1):"0";
    const noShow=appRes.filter(r=>r.meal_status==="no_show").length;
    const noShowRate=totalBookings>0?((noShow/totalBookings)*100).toFixed(1):"0";

    // Separate orders collection (if it exists)
    const totalOrders=filteredOrders.length;
    const completedOrders=filteredOrders.filter(o=>o.status==="completed").length;
    const pendingOrders=filteredOrders.filter(o=>o.status==="pending").length;
    const cancelledOrders=filteredOrders.filter(o=>o.status==="cancelled").length;
    const totalRevenue=filteredOrders.reduce((s,o)=>s+(typeof o.total_amount==="number"?o.total_amount:0),0);
    const avgOrderValue=totalOrders>0?(totalRevenue/totalOrders).toFixed(2):"0";

    const popularItems={};
    filteredOrders.forEach(o=>{
      (o.items||[]).forEach(item=>{
        popularItems[item.name]=(popularItems[item.name]||0)+(item.quantity||1);
      });
    });
    const topItems=Object.entries(popularItems).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // Also count pre-selected menu items from reservations
    const resMenuItems={};
    appRes.forEach(r=>{
      (r.selected_menu_items||[]).forEach(item=>{
        const n=item.name||"Unknown";
        resMenuItems[n]=(resMenuItems[n]||0)+(item.qty||item.quantity||1);
      });
    });
    const topResItems=Object.entries(resMenuItems).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const avgRating=filteredReviews.length>0
      ?(filteredReviews.reduce((s,r)=>s+(typeof r.rating==="number"?r.rating:0),0)/filteredReviews.length).toFixed(1)
      :"0";
    const loyaltyMembers=filteredLoyalty.length;
    const activeLoyalty=filteredLoyalty.filter(l=>safeInt(l.points)>0).length;

    return{
      totalBookings,confirmed,pending,cancelled,
      totalGuests,avgParty,menuRate,reqRate,noShowRate,
      totalOrders,completedOrders,pendingOrders,cancelledOrders,
      totalRevenue,avgOrderValue,topItems,topResItems,
      avgRating,loyaltyMembers,activeLoyalty,withMenuItems
    };
  },[reservations,filteredOrders,filteredReviews,filteredLoyalty]);

  // ── Order trend over time ──
  const orderTrend = useMemo(() => {
    if(!rangeStart||!rangeEnd) return [];
    const map = {};
    const cur = new Date(rangeStart);
    while(cur <= rangeEnd){
      const k = localDateKey(cur);
      map[k] = { date: k, orders: 0, revenue: 0 };
      cur.setDate(cur.getDate() + 1);
    }
    filteredOrders.forEach(order => {
      const d = toDate(order.created_at);
      if(!d || d < rangeStart || d > rangeEnd) return;
      const k = localDateKey(d);
      if(map[k]){
        map[k].orders += 1;
        map[k].revenue += (order.total_amount || 0);
      }
    });
    return Object.values(map).map(v => ({
      ...v,
      label: new Date(v.date+"T12:00:00").toLocaleDateString("en-US", {month:"short",day:"numeric"})
    }));
  }, [filteredOrders, rangeStart, rangeEnd]);

  // ── Order hour distribution ──
  const orderHourDist = useMemo(() => {
    const map = {};
    for(let h=0; h<24; h++) map[h] = { hour: pad2(h), count: 0 };
    filteredOrders.forEach(order => {
      const d = toDate(order.created_at);
      if(!d) return;
      map[d.getHours()].count += 1;
    });
    return Object.values(map);
  }, [filteredOrders]);

  // ── Category sales ──
  const categorySales = useMemo(() => {
    const catMap = {};
    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const cat = item.category || "Other";
        catMap[cat] = (catMap[cat] || 0) + ((item.price || 0) * (item.quantity || 1));
      });
    });
    const colors = [C.orange, C.blue, C.green, C.purple, C.pink, C.teal, C.amber];
    return Object.entries(catMap).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [filteredOrders]);

  // ── Rating distribution ──
  const ratingDist = useMemo(() => {
    const dist = { 1:0, 2:0, 3:0, 4:0, 5:0 };
    filteredReviews.forEach(review => {
      const r = Math.floor(review.rating || 0);
      if(r >= 1 && r <= 5) dist[r] += 1;
    });
    return Object.entries(dist).map(([stars, count]) => ({ stars: `${stars}★`, count }));
  }, [filteredReviews]);

  // ── Customer order frequency ──
  const orderFrequency = useMemo(() => {
    const userOrders = {};
    filteredOrders.forEach(order => {
      const uid = order.user_id || order.customer_phone;
      if(uid) userOrders[uid] = (userOrders[uid] || 0) + 1;
    });
    const freqDist = { "1 order":0, "2-3 orders":0, "4-5 orders":0, "6+ orders":0 };
    Object.values(userOrders).forEach(count => {
      if(count === 1) freqDist["1 order"]++;
      else if(count <= 3) freqDist["2-3 orders"]++;
      else if(count <= 5) freqDist["4-5 orders"]++;
      else freqDist["6+ orders"]++;
    });
    return Object.entries(freqDist).map(([label, count]) => ({ label, count }));
  }, [filteredOrders]);

  // ── Popular items chart data ──
  const popularItemsData = dineryKpis.topItems.map(([name, count]) => ({ name: name.length > 15 ? name.slice(0,12)+"..." : name, count }));

  // ── Guests per day ──
const guestsPerDay=useMemo(()=>{
    if(!rangeStart||!rangeEnd) return[];
    const map={};
    const cur=new Date(rangeStart);
    while(cur<=rangeEnd){
      const k=localDateKey(cur);
      map[k]={date:k,guests:0,bookings:0};
      cur.setDate(cur.getDate()+1);
    }
    reservations.forEach(r=>{
      const d=toDate(r.reservation_date);if(!d)return;
      const k=localDateKey(d);
      if(map[k]){map[k].guests+=safeInt(r.number_of_guests);map[k].bookings+=1;}
    });
    return Object.values(map).map(v=>({...v,label:new Date(v.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}));
  },[reservations,rangeStart,rangeEnd]);

  // ── Duration distribution ──
  const durationDist=useMemo(()=>{
    const map={};
    reservations.forEach(r=>{
      if(!r.duration_minutes)return;
      const bucket=Math.round(r.duration_minutes/15)*15;
      map[bucket]=(map[bucket]||0)+1;
    });
    return Object.entries(map).sort((a,b)=>Number(a[0])-Number(b[0])).map(([mins,count])=>({label:fmtDur(Number(mins)),mins:Number(mins),count}));
  },[reservations]);

  // ══ UNIQUE ANALYTICS ══════════════════════════════════════════════════════

  // 2. Meal status funnel
  const mealFunnelData=useMemo(()=>{
    const statuses=["arrived","food_delivered","dessert","bill_delivered","table_cleared"];
    const labels={"arrived":"Arrived","food_delivered":"Food","dessert":"Dessert","bill_delivered":"Bill","table_cleared":"Cleared"};
    const colors={"arrived":C.red,"food_delivered":C.blue,"dessert":C.purple,"bill_delivered":C.yellow,"table_cleared":C.green};
    const map={};
    statuses.forEach(s=>map[s]=0);
    reservations.forEach(r=>{if(r.meal_status&&map[r.meal_status]!==undefined)map[r.meal_status]+=1;});
    return statuses.map(s=>({name:labels[s],value:map[s],color:colors[s]})).filter(v=>v.value>0);
  },[reservations]);

  // 3. Special requests
  const specialRequestRate=useMemo(()=>{
    const withReq=reservations.filter(r=>r.special_requests&&r.special_requests.trim()).length;
    return kpis.total>0?((withReq/kpis.total)*100).toFixed(1):"0";
  },[reservations,kpis.total]);

  // 4. Booking source trend
  const bookingSourceTrend=useMemo(()=>{
    if(!rangeStart||!rangeEnd) return [];
    const map={};
    reservations.forEach(r=>{
      const d=toDate(r.reservation_date);if(!d)return;
      const mon=new Date(d);mon.setDate(d.getDate()-((d.getDay()+6)%7));mon.setHours(0,0,0,0);
      const k=mon.toISOString().slice(0,10);
      if(!map[k])map[k]={week:mon.toLocaleDateString("en-US",{month:"short",day:"numeric"}),online:0,internal:0,walkin:0};
      if(r.source==="reservation_link"||r.source==="mobile_app") map[k].online+=1;
      else if(r.is_walkin) map[k].walkin+=1;
      else map[k].internal+=1;
    });
    return Object.values(map).sort((a,b)=>a.week.localeCompare(b.week));
  },[reservations,rangeStart,rangeEnd]);

  // 5. Customer retention trend
const customerRetentionTrend=useMemo(()=>{
    const seenBefore=new Set();
    const monthMap={};
    const sorted=[...reservations].filter(r=>toDate(r.reservation_date)).sort((a,b)=>toDate(a.reservation_date)-toDate(b.reservation_date));
    sorted.forEach(r=>{
      const d=toDate(r.reservation_date);
      const key=`${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
      const label=`${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if(!monthMap[key])monthMap[key]={label,newCustomers:0,returning:0};
      const cKey=(r.customer_name||"")+(r.customer_phone||"");
      if(seenBefore.has(cKey)) monthMap[key].returning+=1;
      else { monthMap[key].newCustomers+=1; seenBefore.add(cKey); }
    });
    return Object.entries(monthMap)
      .filter(([k])=>{
        if(!rangeStart||!rangeEnd) return true;
        const d=new Date(k+"-15");
        return d>=new Date(rangeStart.getFullYear(),rangeStart.getMonth(),1) && d<=rangeEnd;
      })
      .map(([,v])=>v);
  },[reservations,rangeStart,rangeEnd]);

  // 6. Heatmap
  const heatmapData=useMemo(()=>{
    const grid={};
    DAYS.forEach(day=>{
      for(let h=10;h<=23;h++){
        grid[`${day}-${h}`]={day,hour:`${pad2(h)}:00`,count:0};
      }
    });
    reservations.forEach(r=>{
      const d=toDate(r.reservation_date);if(!d)return;
      const day=DAYS[d.getDay()];
      const h=d.getHours();
      const k=`${day}-${h}`;
      if(grid[k]) grid[k].count+=1;
    });
    return Object.values(grid);
  },[reservations]);

  const heatMax=useMemo(()=>Math.max(...heatmapData.map(v=>v.count),1),[heatmapData]);
  const heatHours=Array.from({length:14},(_,i)=>pad2(i+10)+":00");

  // 7. Service type distribution
  const serviceTypeData=useMemo(()=>{
    const map={};
    reservations.forEach(r=>{
      const s=r.ServiceType_Reservation||r.service_type||"Standard";
      map[s]=(map[s]||0)+1;
    });
    const palette=[C.orange,C.blue,C.purple,C.teal,C.pink,C.green];
    return Object.entries(map).map(([name,value],i)=>({name,value,color:palette[i%palette.length]})).sort((a,b)=>b.value-a.value);
  },[reservations]);

  // ── Customers ──
  const customerData=useMemo(()=>{
    const map={};
    reservations.forEach(r=>{
      const key=(r.customer_name||"Unknown")+(r.customer_phone||"");
      if(!map[key])map[key]={name:r.customer_name||"Unknown",phone:r.customer_phone||"",email:r.customer_email||"",visits:0,totalGuests:0,lastVisit:null,cancellations:0,noShows:0,specialReqs:0};
      map[key].visits+=1;map[key].totalGuests+=(r.number_of_guests||0);
      if(r.status==="cancelled")map[key].cancellations+=1;
      if(r.meal_status==="no_show")map[key].noShows+=1;
      if(r.special_requests?.trim())map[key].specialReqs+=1;
      const d=toDate(r.reservation_date);
      if(d&&(!map[key].lastVisit||d>map[key].lastVisit))map[key].lastVisit=d;
    });
    let arr=Object.values(map);
    if(search){const q=search.toLowerCase();arr=arr.filter(c=>c.name.toLowerCase().includes(q)||c.phone.includes(q)||c.email.toLowerCase().includes(q));}
    const sf={visits:(a,b)=>b.visits-a.visits,guests:(a,b)=>b.totalGuests-a.totalGuests,lastVisit:(a,b)=>(b.lastVisit||0)-(a.lastVisit||0),name:(a,b)=>a.name.localeCompare(b.name)};
    return arr.sort(sf[custSort]||sf.visits);
  },[reservations,search,custSort]);

  const rangeLabel=rangeStart&&rangeEnd
    ?`${fmt(rangeStart,{month:"short",day:"numeric",year:"numeric"})} – ${fmt(rangeEnd,{month:"short",day:"numeric",year:"numeric"})}`
    :"Select a date range";

  if(analyticsLoading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px 0"}}>
      <div style={{width:28,height:28,borderRadius:"50%",border:`3px solid ${C.orange}`,borderTopColor:"transparent",animation:"spin .8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const maxG=Math.max(...arrivalData.map(x=>x.guests),1);
  const maxB=Math.max(...arrivalData.map(x=>x.bookings),1);
  const maxCPH=Math.max(...createdPerHour.map(x=>x.count),1);
  const maxBPG=Math.max(...bookingsPerGuest.map(x=>x.count),1);
  const maxDD=Math.max(...durationDist.map(x=>x.count),1);

  // Tab content
  const renderReservationAnalytics = () => (
    <>
      {/* ── OVERVIEW ── */}
      <Divider label="Overview" icon="📊"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Card title="Booking status">
          <div style={{display:"flex",alignItems:"center",gap:18}}>
            <DonutChart data={statusData} total={kpis.total} label="Total"/>
            <DonutLegend data={statusData} total={kpis.total}/>
          </div>
        </Card>
        <Card title="Booking origin">
          <div style={{display:"flex",alignItems:"center",gap:18}}>
            <DonutChart data={originData} total={kpis.total} label="Total"/>
            <DonutLegend data={originData} total={kpis.total}/>
          </div>
        </Card>
      </div>

      {/* ── OVER TIME ── */}
      <Divider label="Over time" icon="📈"/>
      <Card title="Guests per day">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={guestsPerDay} margin={{left:0,right:8,top:4,bottom:0}}>
            <defs>
              <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.orange} stopOpacity={0.18}/>
                <stop offset="95%" stopColor={C.orange} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.blue} stopOpacity={0.14}/>
                <stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="label" tick={axisStyle} interval={Math.max(0,Math.floor(guestsPerDay.length/14))}/>
            <YAxis tick={axisStyle}/>
            <Tooltip content={<CTip/>}/>
            <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11}}/>
            <Area type="monotone" dataKey="guests"   name="Guests"   stroke={C.orange} fill="url(#gG)" strokeWidth={2} dot={false}/>
            <Area type="monotone" dataKey="bookings" name="Bookings" stroke={C.blue}   fill="url(#bG)" strokeWidth={2} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ── ARRIVAL PATTERNS ── */}
      <Divider label="Arrival patterns" icon="🕐"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Card title="Number of guests per arrival time">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={arrivalData} margin={{left:0,right:8,top:4,bottom:0}}>
              <CartesianGrid {...gridProps}/>
              <XAxis dataKey="time" tick={axisStyle}/>
              <YAxis tick={axisStyle}/>
              <Tooltip content={<CTip/>}/>
              <Bar dataKey="guests" name="Guests per slot" radius={[3,3,0,0]}>
                {arrivalData.map((v,i)=><Cell key={i} fill={C.blue} opacity={0.18+0.82*(v.guests/maxG)}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Number of bookings per arrival time">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={arrivalData} margin={{left:0,right:8,top:4,bottom:0}}>
              <CartesianGrid {...gridProps}/>
              <XAxis dataKey="time" tick={axisStyle}/>
              <YAxis tick={axisStyle}/>
              <Tooltip content={<CTip/>}/>
              <Bar dataKey="bookings" name="Bookings" radius={[3,3,0,0]}>
                {arrivalData.map((v,i)=><Cell key={i} fill={C.teal} opacity={0.18+0.82*(v.bookings/maxB)}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── BOOKING DETAILS ── */}
      <Divider label="Booking details" icon="📋"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Card title="Bookings per guests">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={bookingsPerGuest} layout="vertical" margin={{left:0,right:28,top:4,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
              <XAxis type="number" tick={axisStyle}/>
              <YAxis type="category" dataKey="label" tick={axisStyle} width={20}/>
              <Tooltip content={<CTip/>}/>
              <Bar dataKey="count" name="Bookings per guests" radius={[0,3,3,0]}>
                {bookingsPerGuest.map((v,i)=><Cell key={i} fill={C.orange} opacity={v.count===0?0.06:0.18+0.82*(v.count/maxBPG)}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Bookings duration – grouped by 15min">
          {durationDist.length===0?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:250,color:"#cbd5e1",fontSize:12}}>No duration data</div>
          ):(
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={durationDist} layout="vertical" margin={{left:0,right:28,top:4,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                <XAxis type="number" tick={axisStyle}/>
                <YAxis type="category" dataKey="label" tick={axisStyle} width={46}/>
                <Tooltip content={<CTip/>}/>
                <Bar dataKey="count" name="Bookings" radius={[0,3,3,0]}>
                  {durationDist.map((v,i)=><Cell key={i} fill={C.teal} opacity={0.18+0.82*(v.count/maxDD)}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {createdPerHour.length>0&&(
        <Card title="Bookings created per hour" subtitle="What hour of day customers submit their reservation">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={createdPerHour} margin={{left:0,right:8,top:4,bottom:0}}>
              <CartesianGrid {...gridProps}/>
              <XAxis dataKey="hour" tick={axisStyle}/>
              <YAxis tick={axisStyle}/>
              <Tooltip content={<CTip/>}/>
              <Bar dataKey="count" name="Bookings created" radius={[3,3,0,0]}>
                {createdPerHour.map((v,i)=><Cell key={i} fill={C.purple} opacity={0.18+0.82*(v.count/maxCPH)}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── UNIQUE INSIGHTS ── */}
      <Divider label="Exclusive insights" icon="✨"/>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Card title="Booking lead time" subtitle="How far in advance guests book"
          badge={{label:"Exclusive",bg:"#fef3c7",color:"#92400e"}}>
          {leadTimeData.length===0?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:180,color:"#cbd5e1",fontSize:12}}>No created_at data</div>
          ):(
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={leadTimeData} margin={{left:0,right:8,top:4,bottom:0}}>
                <CartesianGrid {...gridProps}/>
                <XAxis dataKey="label" tick={axisStyle}/>
                <YAxis tick={axisStyle}/>
                <Tooltip content={<CTip/>}/>
                <Bar dataKey="count" name="Bookings" radius={[4,4,0,0]}>
                  {leadTimeData.map((_,i)=><Cell key={i} fill={[C.orange,C.orange2,C.yellow,C.teal,C.blue,C.purple][i%6]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Meal status progression" subtitle="How far guests made it through their visit"
          badge={{label:"Exclusive",bg:"#fef3c7",color:"#92400e"}}>
          {mealFunnelData.length===0?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:180,color:"#cbd5e1",fontSize:12}}>No meal status data</div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
              {["arrived","food_delivered","dessert","bill_delivered","table_cleared"].map(s=>{
                const labels={"arrived":"Arrived","food_delivered":"Food delivered","dessert":"Dessert","bill_delivered":"Bill delivered","table_cleared":"Table cleared"};
                const colors2={"arrived":C.red,"food_delivered":C.blue,"dessert":C.purple,"bill_delivered":C.yellow,"table_cleared":C.green};
                const cnt=reservations.filter(r=>r.meal_status===s).length;
                const pct=kpis.total>0?((cnt/kpis.total)*100):0;
                return(
                  <div key={s} style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:11,color:"#6b7280",width:110,flexShrink:0}}>{labels[s]}</span>
                    <div style={{flex:1,height:20,background:"#f1f5f9",borderRadius:6,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:colors2[s],borderRadius:6,minWidth:cnt>0?4:0,transition:"width .4s"}}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:"#374151",width:28,textAlign:"right"}}>{cnt}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {bookingSourceTrend.length>1&&(
        <Card title="Booking source trend by week" subtitle="Online vs internal vs walk-in over time"
          badge={{label:"Exclusive",bg:"#fef3c7",color:"#92400e"}}>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={bookingSourceTrend} margin={{left:0,right:8,top:4,bottom:0}}>
              <defs>
                <linearGradient id="oG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.blue} stopOpacity={0.2}/><stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="iG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.purple} stopOpacity={0.2}/><stop offset="95%" stopColor={C.purple} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="wG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.orange} stopOpacity={0.2}/><stop offset="95%" stopColor={C.orange} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="week" tick={axisStyle}/>
              <YAxis tick={axisStyle}/>
              <Tooltip content={<CTip/>}/>
              <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11}}/>
              <Area type="monotone" dataKey="online"   name="Online"   stroke={C.blue}   fill="url(#oG)" strokeWidth={2} dot={false}/>
              <Area type="monotone" dataKey="internal" name="Internal" stroke={C.purple} fill="url(#iG)" strokeWidth={2} dot={false}/>
              <Area type="monotone" dataKey="walkin"   name="Walk-in"  stroke={C.orange} fill="url(#wG)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {customerRetentionTrend.length>1&&(
        <Card title="New vs returning customers" subtitle="Monthly customer retention trend"
          badge={{label:"Exclusive",bg:"#fef3c7",color:"#92400e"}}>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={customerRetentionTrend} margin={{left:0,right:8,top:4,bottom:0}}>
              <CartesianGrid {...gridProps}/>
              <XAxis dataKey="label" tick={axisStyle}/>
              <YAxis tick={axisStyle}/>
              <Tooltip content={<CTip/>}/>
              <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11}}/>
              <Bar dataKey="newCustomers" name="New"       fill={C.blue}   radius={[3,3,0,0]} stackId="a"/>
              <Bar dataKey="returning"    name="Returning" fill={C.green}  radius={[3,3,0,0]} stackId="a"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
        <Card title="Reservation heatmap" subtitle="Bookings by day of week & hour — darker = busier"
          badge={{label:"Exclusive",bg:"#fef3c7",color:"#92400e"}}>
          <div style={{overflowX:"auto"}}>
            <div style={{minWidth:420}}>
              <div style={{display:"flex",marginLeft:36,marginBottom:4}}>
                {heatHours.map(h=>(
                  <div key={h} style={{flex:1,textAlign:"center",fontSize:9,color:"#94a3b8",fontWeight:600}}>{h.slice(0,2)}</div>
                ))}
              </div>
              {DAYS.map(day=>(
                <div key={day} style={{display:"flex",alignItems:"center",marginBottom:3}}>
                  <span style={{width:32,fontSize:10,fontWeight:700,color:"#94a3b8",flexShrink:0}}>{day}</span>
                  {heatHours.map(hourStr=>{
                    const h=parseInt(hourStr);
                    const cell=heatmapData.find(v=>v.day===day&&v.hour===hourStr);
                    const cnt=cell?.count||0;
                    const intensity=cnt===0?0:0.1+0.9*(cnt/heatMax);
                    return(
                      <div key={hourStr} style={{flex:1,height:24,margin:"0 1px",borderRadius:4,
                        background:cnt===0?"#f8fafc":`rgba(254,138,36,${intensity})`,
                        display:"flex",alignItems:"center",justifyContent:"center",cursor:"default",
                        position:"relative"}}
                        title={`${day} ${hourStr}: ${cnt} booking${cnt!==1?"s":""}`}>
                        {cnt>0&&<span style={{fontSize:9,fontWeight:700,color:intensity>0.5?"#fff":"#92400e"}}>{cnt}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Service types" subtitle="Breakdown by reservation type"
          badge={{label:"Exclusive",bg:"#fef3c7",color:"#92400e"}}>
          {serviceTypeData.length===0?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:180,color:"#cbd5e1",fontSize:12}}>No service type data</div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:4}}>
              {serviceTypeData.slice(0,6).map((d,i)=>{
                const pct=kpis.total>0?((d.value/kpis.total)*100):0;
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:8,height:8,borderRadius:"50%",backgroundColor:d.color,flexShrink:0}}/>
                    <span style={{fontSize:11,color:"#6b7280",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</span>
                    <div style={{width:60,height:6,background:"#f1f5f9",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:d.color,borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:"#374151",width:22,textAlign:"right"}}>{d.value}</span>
                  </div>
                );
              })}
              <div style={{marginTop:4,paddingTop:8,borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:10,color:"#94a3b8"}}>Special requests</span>
                <span style={{fontSize:11,fontWeight:700,color:C.orange}}>{specialRequestRate}% of bookings</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Divider label="Day of week" icon="📅"/>
      <Card title="Busiest weekdays">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekdayData} margin={{left:0,right:8,top:4,bottom:0}}>
            <CartesianGrid {...gridProps}/>
            <XAxis dataKey="day" tick={axisStyle}/>
            <YAxis tick={axisStyle}/>
            <Tooltip content={<CTip/>}/>
            <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11}}/>
            <Bar dataKey="bookings" name="Bookings" fill={C.orange}  radius={[4,4,0,0]}/>
            <Bar dataKey="guests"   name="Guests"   fill={C.orange2} radius={[4,4,0,0]} opacity={0.65}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Divider label="Customers" icon="👥"/>
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
          <span style={{fontSize:12,color:"#6b7280"}}>
            <b style={{color:"#111827"}}>{customerData.length}</b> customers ·{" "}
            <b style={{color:C.green}}>{kpis.repeatRate}%</b> repeat ·{" "}
            <b style={{color:C.orange}}>{specialRequestRate}%</b> send special requests
          </span>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"5px 10px"}}>
              <svg width="13" height="13" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
              </svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                style={{background:"transparent",border:"none",outline:"none",fontSize:12,color:"#374151",width:90}}/>
              {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:13,lineHeight:1}}>×</button>}
            </div>
            <div style={{display:"flex",gap:4}}>
              {[["visits","Visits"],["guests","Guests"],["lastVisit","Recent"],["name","Name"]].map(([k,l])=>(
                <button key={k} onClick={()=>setCustSort(k)}
                  style={{padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",border:`1px solid ${custSort===k?C.orange:"#e2e8f0"}`,background:custSort===k?C.orange:"#fff",color:custSort===k?"#fff":"#6b7280"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:14,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 60px 60px 105px 56px 52px 56px",background:"#f8fafc",borderBottom:"1px solid #f1f5f9",padding:"7px 18px"}}>
            {["Customer","Visits","Guests","Last Visit","Cancel","No-show","Requests"].map((h,i)=>(
              <span key={i} style={{fontSize:9,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.1em",textAlign:i>0?"right":"left"}}>{h}</span>
            ))}
          </div>
          <div style={{maxHeight:300,overflowY:"auto"}}>
            {customerData.length===0?(
              <div style={{padding:"28px 0",textAlign:"center",fontSize:13,color:"#9ca3af"}}>No customers found</div>
            ):customerData.map((c,i)=>(
              <div key={i}
                style={{display:"grid",gridTemplateColumns:"1fr 60px 60px 105px 56px 52px 56px",padding:"9px 18px",borderBottom:"1px solid #f9fafb",alignItems:"center",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#fafafa"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{c.name}</div>
                  {c.phone&&<div style={{fontSize:11,color:"#94a3b8"}}>{c.phone}</div>}
                </div>
                <div style={{textAlign:"right",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>{c.visits}</span>
                  {c.visits>1&&<span style={{fontSize:8,fontWeight:800,padding:"1px 4px",borderRadius:20,background:C.green+"18",color:C.green}}>★</span>}
                </div>
                <div style={{textAlign:"right",fontSize:13,fontWeight:600,color:"#374151"}}>{c.totalGuests}</div>
                <div style={{fontSize:11,color:"#6b7280"}}>{c.lastVisit?fmt(c.lastVisit,{month:"short",day:"numeric",year:"numeric"}):"—"}</div>
                <div style={{textAlign:"right"}}>
                  {c.cancellations>0?<span style={{fontSize:11,fontWeight:700,padding:"2px 6px",borderRadius:20,background:C.red+"15",color:C.red}}>{c.cancellations}</span>:<span style={{fontSize:11,color:"#e2e8f0"}}>—</span>}
                </div>
                <div style={{textAlign:"right"}}>
                  {c.noShows>0?<span style={{fontSize:11,fontWeight:700,padding:"2px 6px",borderRadius:20,background:C.red+"15",color:C.red}}>{c.noShows}</span>:<span style={{fontSize:11,color:"#e2e8f0"}}>—</span>}
                </div>
                <div style={{textAlign:"right"}}>
                  {c.specialReqs>0?<span style={{fontSize:11,fontWeight:700,padding:"2px 6px",borderRadius:20,background:C.purple+"15",color:C.purple}}>{c.specialReqs}</span>:<span style={{fontSize:11,color:"#e2e8f0"}}>—</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderDineryAnalytics = () => (
    <>
      {/* ── DINERY APP KPIs ── */}
      <Divider label="Dinery App Overview" icon="📱"/>
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #f1f5f9",padding:"16px 20px",marginBottom:6}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:0}}>
          {[
          {label:"App Bookings",  value:dineryKpis.totalBookings,                                               color:"#111827"},
          {label:"Confirmed",     value:dineryKpis.confirmed,   sub:fmtPct(dineryKpis.confirmed,dineryKpis.totalBookings),   color:C.green},
          {label:"Cancelled",     value:dineryKpis.cancelled,   sub:fmtPct(dineryKpis.cancelled,dineryKpis.totalBookings),   color:C.red},
          {label:"Total Guests",  value:fmtNum(dineryKpis.totalGuests),                                         color:C.orange},
          {label:"Avg Party",     value:dineryKpis.avgParty,    sub:"per booking",                              color:C.blue},
          {label:"Pre-ordered",   value:`${dineryKpis.menuRate}%`, sub:`${dineryKpis.withMenuItems} bookings`,  color:C.purple},
          {label:"Special Reqs",  value:`${dineryKpis.reqRate}%`,                                               color:C.teal},
          {label:"No-show Rate",  value:`${dineryKpis.noShowRate}%`,                                            color:+dineryKpis.noShowRate>5?C.red:"#374151"},
          ].map((item,i,arr)=>(
            <div key={i} style={{padding:"4px 14px",borderRight:i<arr.length-1?"1px solid #f1f5f9":"none",display:"flex",flexDirection:"column",gap:3}}>
              <span style={{fontSize:9,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.1em"}}>{item.label}</span>
              <span style={{fontSize:20,fontWeight:900,color:item.color,lineHeight:1}}>{item.value}</span>
              {item.sub&&<span style={{fontSize:9,color:"#94a3b8"}}>{item.sub}</span>}
            </div>
          ))}
        </div>
      </div>

      {dineryKpis.totalBookings === 0 ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"72px 0",background:"#fff",borderRadius:14,border:"1px solid #f1f5f9",marginTop:16}}>
          <span style={{fontSize:44,marginBottom:12}}>📱</span>
          <p style={{fontSize:15,fontWeight:700,color:"#9ca3af",margin:0}}>No Dinery App orders yet</p>
          <p style={{fontSize:12,color:"#cbd5e1",marginTop:4}}>Orders from the mobile app will appear here</p>
        </div>
      ) : (
        <>
          {/* ── ORDER TREND ── */}
          <Divider label="Order trends" icon="📈"/>
          <Card title="Daily orders & revenue">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={orderTrend} margin={{left:0,right:8,top:4,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="label" tick={axisStyle} interval={Math.max(0,Math.floor(orderTrend.length/14))}/>
                <YAxis yAxisId="left" tick={axisStyle}/>
                <YAxis yAxisId="right" orientation="right" tick={axisStyle}/>
                <Tooltip content={<CTip/>}/>
                <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11}}/>
                <Bar yAxisId="left" dataKey="orders" name="Orders" fill={C.orange} radius={[3,3,0,0]} barSize={30}/>
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue ($)" stroke={C.green} strokeWidth={2} dot={{r:3}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* ── ORDER TIME DISTRIBUTION ── */}
          <Divider label="Order behavior" icon="🕐"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Card title="Orders by hour">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={orderHourDist} margin={{left:0,right:8,top:4,bottom:0}}>
                  <CartesianGrid {...gridProps}/>
                  <XAxis dataKey="hour" tick={axisStyle}/>
                  <YAxis tick={axisStyle}/>
                  <Tooltip content={<CTip/>}/>
                  <Bar dataKey="count" name="Orders" fill={C.blue} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Customer order frequency">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={orderFrequency} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} label={({label, percent}) => `${label} ${(percent*100).toFixed(0)}%`}>
                    {orderFrequency.map((entry, i) => (
                      <Cell key={i} fill={[C.orange, C.blue, C.green, C.purple][i % 4]}/>
                    ))}
                  </Pie>
                  <Tooltip content={<CTip/>}/>
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* ── POPULAR ITEMS & CATEGORIES ── */}
          <Divider label="Menu performance" icon="🍽️"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Card title="Top selling items">
              {popularItemsData.length === 0 ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:220,color:"#cbd5e1",fontSize:12}}>No items data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={popularItemsData} layout="vertical" margin={{left:0,right:20,top:4,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                    <XAxis type="number" tick={axisStyle}/>
                    <YAxis type="category" dataKey="name" tick={axisStyle} width={80}/>
                    <Tooltip content={<CTip/>}/>
                    <Bar dataKey="count" name="Times ordered" fill={C.orange} radius={[0,3,3,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Sales by category">
              {categorySales.length === 0 ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:220,color:"#cbd5e1",fontSize:12}}>No category data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categorySales} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                      {categorySales.map((entry, i) => (
                        <Cell key={i} fill={entry.color}/>
                      ))}
                    </Pie>
                    <Tooltip content={<CTip/>}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* ── REVIEWS & RATINGS ── */}
          <Divider label="Customer feedback" icon="⭐"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Card title="Rating distribution">
              {ratingDist.length === 0 ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:"#cbd5e1",fontSize:12}}>No reviews yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ratingDist} margin={{left:0,right:8,top:4,bottom:0}}>
                    <CartesianGrid {...gridProps}/>
                    <XAxis dataKey="stars" tick={axisStyle}/>
                    <YAxis tick={axisStyle}/>
                    <Tooltip content={<CTip/>}/>
                    <Bar dataKey="count" name="Reviews" fill={C.amber} radius={[3,3,0,0]}>
                      {ratingDist.map((v,i)=><Cell key={i} fill={[C.red, C.orange, C.yellow, C.green, C.emerald][i]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Customer satisfaction metrics" badge={{label:"Insight",bg:"#e0f2fe",color:"#0369a1"}}>
              <div style={{display:"flex",flexDirection:"column",gap:20,marginTop:10}}>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:12,color:"#6b7280"}}>Average rating</span>
                    <span style={{fontSize:20,fontWeight:900,color:C.amber}}>{dineryKpis.avgRating}</span>
                  </div>
                  <div style={{width:"100%",height:8,background:"#f1f5f9",borderRadius:4,overflow:"hidden"}}>
                    <div style={{width:`${(dineryKpis.avgRating/5)*100}%`,height:"100%",background:C.amber,borderRadius:4}}/>
                  </div>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:12,color:"#6b7280"}}>Customer satisfaction</span>
                    <span style={{fontSize:20,fontWeight:900,color:C.green}}>
                      {filteredReviews.filter(r => r.rating >= 4).length > 0 
                        ? `${Math.round((filteredReviews.filter(r => r.rating >= 4).length / filteredReviews.length) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                  <div style={{width:"100%",height:8,background:"#f1f5f9",borderRadius:4,overflow:"hidden"}}>
                    <div style={{width:`${filteredReviews.filter(r => r.rating >= 4).length / filteredReviews.length * 100 || 0}%`,height:"100%",background:C.green,borderRadius:4}}/>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:24,fontWeight:900,color:C.blue}}>{filteredReviews.length}</div>
                    <div style={{fontSize:10,color:"#94a3b8"}}>Total reviews</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:24,fontWeight:900,color:C.purple}}>{filteredLoyalty.length}</div>
                    <div style={{fontSize:10,color:"#94a3b8"}}>Loyalty members</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:24,fontWeight:900,color:C.green}}>{dineryKpis.completedOrders}</div>
                    <div style={{fontSize:10,color:"#94a3b8"}}>Completed orders</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ── CONVERSION METRICS ── */}
          <Divider label="App engagement" icon="📊"/>
          <Card title="Order conversion & loyalty impact">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:15}}>
              <div style={{textAlign:"center",padding:12,background:"#f8fafc",borderRadius:10}}>
                <div style={{fontSize:28,fontWeight:900,color:C.orange}}>
                  {dineryKpis.totalOrders > 0 ? `${Math.round((dineryKpis.completedOrders / dineryKpis.totalOrders) * 100)}%` : "0%"}
                </div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:5}}>Completion rate</div>
              </div>
              <div style={{textAlign:"center",padding:12,background:"#f8fafc",borderRadius:10}}>
                <div style={{fontSize:28,fontWeight:900,color:C.green}}>
                  {dineryKpis.loyaltyMembers > 0 ? `${Math.round((dineryKpis.activeLoyalty / dineryKpis.loyaltyMembers) * 100)}%` : "0%"}
                </div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:5}}>Loyalty engagement</div>
              </div>
              <div style={{textAlign:"center",padding:12,background:"#f8fafc",borderRadius:10}}>
                <div style={{fontSize:28,fontWeight:900,color:C.blue}}>
                  {filteredReviews.length > 0 ? `${Math.round((filteredReviews.filter(r => r.rating >= 4).length / filteredReviews.length) * 100)}%` : "0%"}
                </div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:5}}>Positive reviews (4-5★)</div>
              </div>
            </div>
          </Card>
        </>
      )}
    </>
  );

  return (
    <div style={{fontFamily:"'DM Sans','Outfit',system-ui,sans-serif"}}>
      <style>{`.apill{transition:all .12s;cursor:pointer;border:1px solid #e2e8f0;background:#fff;color:#6b7280;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.02em;}.apill:hover{border-color:${C.orange};color:${C.orange};}.apill.active{background:${C.orange};color:#fff;border-color:${C.orange};}`}</style>

      {/* ── Top bar ── */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:18}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:900,color:"#111827",letterSpacing:"-0.02em",margin:0}}>Analytics Dashboard</h2>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:7}}>
            <div style={{position:"relative",display:"inline-block"}}>
              <select value={selRestaurant} onChange={e=>setSelRestaurant(e.target.value)}
                style={{appearance:"none",WebkitAppearance:"none",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"5px 30px 5px 10px",fontSize:12,fontWeight:600,color:"#374151",cursor:"pointer",outline:"none"}}>
                <option value="all">All restaurants</option>
                {restaurants.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <svg style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="11" height="11" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
            <span style={{color:"#e2e8f0"}}>·</span>
            <span style={{fontSize:11,color:"#94a3b8"}}>{rangeLabel}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          {PERIODS.map(p=>(
            <button key={p.key} className={`apill${period===p.key?" active":""}`} onClick={()=>setPeriod(p.key)}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Custom pickers */}
      {period==="custom"&&(
        <div style={{display:"flex",alignItems:"center",gap:12,background:"#fff",borderRadius:14,border:"1px solid #e2e8f0",padding:"10px 16px",marginBottom:18,flexWrap:"wrap"}}>
          <svg width="15" height="15" fill="none" stroke={C.orange} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span style={{fontSize:11,fontWeight:600,color:"#6b7280"}}>From</span>
          <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)}
            style={{border:"1px solid #e2e8f0",borderRadius:9,padding:"4px 9px",fontSize:12,outline:"none",background:"#f8fafc"}}/>
          <span style={{fontSize:11,fontWeight:600,color:"#6b7280"}}>To</span>
          <input type="date" value={customEnd} min={customStart} onChange={e=>setCustomEnd(e.target.value)}
            style={{border:"1px solid #e2e8f0",borderRadius:9,padding:"4px 9px",fontSize:12,outline:"none",background:"#f8fafc"}}/>
          {customStart&&customEnd&&(
            <button onClick={()=>{setCustomStart("");setCustomEnd("");}} style={{marginLeft:"auto",fontSize:11,color:"#94a3b8",background:"none",border:"none",cursor:"pointer"}}>Clear</button>
          )}
        </div>
      )}

      {/* ── KPI SCORECARD ── */}
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #f1f5f9",padding:"16px 20px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",marginBottom:6}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:16}}>
          {[
            {label:"Bookings", value:kpis.total.toLocaleString(), color:"#111827", description:""},
            {label:"Confirmed", value:kpis.confirmed.toLocaleString(), sub:`${((kpis.confirmed/kpis.total)*100).toFixed(1)}%`, color:C.green, description:"of total"},
            {label:"Cancelled", value:kpis.cancelled.toLocaleString(), sub: kpis.total > 0 ? `${((kpis.cancelled/kpis.total)*100).toFixed(1)}%` : "0%", color:C.red, description:"of total"},
            {label:"Pending", value:kpis.pending.toLocaleString(), sub: kpis.total > 0 ? `${((kpis.pending/kpis.total)*100).toFixed(1)}%` : "0%", color:C.yellow, description:"of total"},
            {label:"Guests",      value:fmtNum(kpis.totalG),    color:C.blue,    description:"total guests"},
            {label:"Avg party",   value:kpis.avgG,              color:"#374151", description:"per booking"},
            {label:"Avg stay",    value:fmtDur(kpis.avgDur),    color:"#374151", description:""},
            {label:"No-show rate",value:`${kpis.noShowRate}%`,  color:+kpis.noShowRate>5?C.red:"#374151", description:kpis.noShow>0?`${kpis.noShow} no-shows`:""},
            {label:"Repeat rate", value:`${kpis.repeatRate}%`,  color:C.green,   description:kpis.totalCustomers>0?`${kpis.repeatCustomers} of ${kpis.totalCustomers}`:""},
          ].map((item,i)=>(
            <div key={i} style={{padding:"8px 12px",borderRight:i<8?"1px solid #f1f5f9":"none",display:"flex",flexDirection:"column",gap:4,minWidth:0}}>
              <span style={{fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em"}}>{item.label}</span>
              <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:22,fontWeight:900,color:item.color,lineHeight:1.2,wordBreak:"break-word"}}>{item.value}</span>
                {item.sub && (
                  <span style={{fontSize:11,fontWeight:700,color:item.color,background:`${item.color}15`,padding:"2px 6px",borderRadius:12}}>
                    {item.sub}
                  </span>
                )}
              </div>
              {item.description && (
                <span style={{fontSize:9,color:"#cbd5e1",marginTop:2}}>{item.description}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* ── TAB NAVIGATION ── */}
      <div style={{display:"flex",gap:10,marginTop:20,marginBottom:20,borderBottom:"1px solid #e2e8f0"}}>
        <button
          onClick={() => setActiveTab("reservations")}
          style={{
            padding:"10px 20px",
            fontSize:14,
            fontWeight:700,
            border:"none",
            background:"transparent",
            cursor:"pointer",
            color: activeTab === "reservations" ? C.orange : "#94a3b8",
            borderBottom: activeTab === "reservations" ? `2px solid ${C.orange}` : "2px solid transparent",
            transition:"all 0.2s"
          }}
        >
          📅 Reservation Analytics
        </button>
        <button
          onClick={() => setActiveTab("dinery")}
          style={{
            padding:"10px 20px",
            fontSize:14,
            fontWeight:700,
            border:"none",
            background:"transparent",
            cursor:"pointer",
            color: activeTab === "dinery" ? C.orange : "#94a3b8",
            borderBottom: activeTab === "dinery" ? `2px solid ${C.orange}` : "2px solid transparent",
            transition:"all 0.2s"
          }}
        >
          📱 Dinery App Analytics
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      {reservations.length === 0 && activeTab === "reservations" ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"72px 0",background:"#fff",borderRadius:14,border:"1px solid #f1f5f9",marginTop:16}}>
          <span style={{fontSize:44,marginBottom:12}}>📊</span>
          <p style={{fontSize:15,fontWeight:700,color:"#9ca3af",margin:0}}>No reservations in this period</p>
          <p style={{fontSize:12,color:"#cbd5e1",marginTop:4}}>Try a different date range or restaurant</p>
        </div>
      ) : activeTab === "reservations" ? (
        renderReservationAnalytics()
      ) : (
        renderDineryAnalytics()
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [userRole,        setUserRole]        = useState(null);
  const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
  const staffRole         = sessionStorage.getItem("staffRole");
  const isStaff           = !!staffRestaurantId;
  const [restaurants,     setRestaurants]     = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [lang,            setLang]            = useState(localStorage.getItem("app_lang")||"en");
  const [fullscreen,      setFullscreen]      = useState(false);

  const localeMap={en:"en-US",fi:"fi-FI",no:"nb-NO",sv:"sv-SE",de:"de-DE"};
  const i18n={
    en:{dashboard:"Restaurant Dashboard",testerDashboard:"Tester Dashboard",role:"Restaurant Owner",testerRole:"Tester"},
    fi:{dashboard:"Ravintolan hallintapaneeli",testerDashboard:"Testaajan hallintapaneeli",role:"Ravintolan omistaja",testerRole:"Testaaja"},
    no:{dashboard:"Restaurantdashbord",testerDashboard:"Tester dashbord",role:"Restaurant-eier",testerRole:"Tester"},
    sv:{dashboard:"Restaurangöversikt",testerDashboard:"Testare översikt",role:"Restaurangägare",testerRole:"Testare"},
    de:{dashboard:"Restaurant-Dashboard",testerDashboard:"Tester-Dashboard",role:"Restaurantinhaber",testerRole:"Tester"},
  };
  const t=(k)=>i18n[lang]?.[k]||i18n.en[k]||k;
  const auth=getAuth(),firestore=getFirestore(),user=auth.currentUser;

  useEffect(()=>{const x=setInterval(()=>setCurrentDateTime(new Date()),1000);return()=>clearInterval(x);},[]);
  useEffect(()=>{const h=(e)=>{if(typeof e?.detail==="string")setLang(e.detail);};window.addEventListener("app:setLanguage",h);return()=>window.removeEventListener("app:setLanguage",h);},[]);

  useEffect(()=>{
    if(!user)return;
    getDoc(doc(firestore,"users",user.uid)).then(s=>{
      if(s.exists())setUserRole((s.data().role||"").toLowerCase());
    }).catch(console.error);
  },[user,firestore]);

  useEffect(()=>{
    if(!user) return;

    // ── Staff: load only their assigned restaurant ────────────────────
    if(isStaff) {
      getDoc(doc(firestore,"restaurants",staffRestaurantId)).then(snap=>{
        if(snap.exists()){
          setRestaurants([{ id:snap.id, ...snap.data(), _collection:"restaurants" }]);
        }
      }).catch(console.error);
      return;
    }

    // ── Owner: load all owned restaurants ────────────────────────────
    const uid=user.uid;
    let r1=[],r2=[];
    const merge=()=>setRestaurants([...r1,...r2]);

    const unsub1=onSnapshot(
      query(collection(firestore,"restaurants"),where("Owner_ID","==",uid)),
      snap=>{r1=snap.docs.map(d=>({id:d.id,...d.data(),_collection:"restaurants"}));merge();}
    );
    const unsub2=onSnapshot(
      query(collection(firestore,"TestRestaurant"),where("Owner_ID","==",uid)),
      snap=>{r2=snap.docs.map(d=>({id:d.id,...d.data(),_collection:"TestRestaurant"}));merge();}
    );
    return()=>{unsub1();unsub2();};
  },[user,firestore,isStaff,staffRestaurantId]);

  useEffect(()=>{
    const h=(e)=>{if(e.key==="Escape"&&fullscreen)setFullscreen(false);};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[fullscreen]);

  const locale=localeMap[lang]||"en-US";
  const formattedDate=currentDateTime.toLocaleDateString(locale,{weekday:"long",month:"long",day:"numeric",year:"numeric"});

  if(fullscreen) return(
    <div style={{position:"fixed",inset:0,background:"#f8fafc",zIndex:9999,overflow:"auto",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:15,fontWeight:800,color:"#111827"}}>Analytics Dashboard</span>
          <span style={{fontSize:11,color:"#94a3b8"}}>{formattedDate}</span>
        </div>
        <button onClick={()=>setFullscreen(false)}
          style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",fontSize:12,fontWeight:600,color:"#374151",cursor:"pointer"}}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Exit fullscreen
        </button>
      </div>
      <div style={{flex:1,padding:"24px 32px",maxWidth:1400,margin:"0 auto",width:"100%"}}>
        <AnalyticsSection restaurants={restaurants}/>
      </div>
    </div>
  );

  return(
    <div className="min-h-screen w-full bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">{userRole==="tester"?t("testerDashboard"):t("dashboard")}</h1>
              <p className="text-orange-500 font-bold text-sm mt-1">{formattedDate}</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  isStaff ? "bg-blue-400" :
                  userRole==="tester" ? "bg-blue-500" : "bg-green-500"
                }`}/>
                <span className="text-sm font-medium text-gray-700">
                  {isStaff
                    ? (staffRole?.charAt(0).toUpperCase() + staffRole?.slice(1) || "Staff")
                    : userRole==="tester" ? t("testerRole") : t("role")}
                </span>
              </div>
              <button onClick={()=>setFullscreen(true)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",fontSize:12,fontWeight:600,color:"#374151",cursor:"pointer",transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#fe8a24";e.currentTarget.style.color="#fe8a24";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.color="#374151";}}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                </svg>
                Fullscreen
              </button>
              <div className="bg-gray-800 text-white p-3 rounded-lg"><RestaurantIcon className="h-5 w-5"/></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnalyticsSection restaurants={restaurants}/>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const RestaurantIcon=({className="h-6 w-6"})=>(<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>);