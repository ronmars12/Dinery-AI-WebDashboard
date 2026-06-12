import React, { useState, useEffect } from "react";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  serverTimestamp 
} from "firebase/firestore";
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiTrash2, 
  FiMail, 
  FiPhone, 
  FiGlobe,
  FiClock,
  FiUser
} from "react-icons/fi";

const TestAccountRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, approved, rejected
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const db = getFirestore();

  useEffect(() => {
    const q = query(
      collection(db, "AccountRequestTesting"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(requestsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const handleApprove = async (request) => {
    try {
      const tempPassword = Math.random().toString(36).slice(-10);

      // Update status to approved
      await updateDoc(doc(db, "AccountRequestTesting", request.id), {
        status: "approved",
        approvedAt: serverTimestamp(),
      });

      // Call the provisioning function to create restaurant account with role: tester
      const functionUrl = `https://us-central1-${db.app.options.projectId}.cloudfunctions.net/provisionRestaurantAccount`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.email,
          firstName: request.firstName,
          lastName: request.lastName,
          contact: request.contact,
          website: request.website,
          plan: request.plan || 'starter',
          password: tempPassword,
          role: 'tester', // NEW: Set role as tester
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create test account');
      }

      // Fetch admin emails
      const adminEmailsSnapshot = await getDocs(collection(db, 'AdminEmail'));
      const adminEmails = adminEmailsSnapshot.docs.map(doc => doc.data().Email);

      // Send notification to admin about successful creation
      await addDoc(collection(db, "mail"), {
        to: adminEmails,
        message: {
          subject: `✅ Test Account Approved & Created - ${request.firstName} ${request.lastName}`,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">✅ Test Account Approved & Created</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px;">
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Account Details</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 0; color: #6b7280; font-weight: 500;">
                    <span style="margin-right: 8px;">👤</span> Owner:
                  </td>
                  <td style="padding: 12px 0; color: #111827; text-align: right;">${request.firstName} ${request.lastName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 0; color: #6b7280; font-weight: 500;">
                    <span style="margin-right: 8px;">📧</span> Email:
                  </td>
                  <td style="padding: 12px 0; text-align: right;">
                    <a href="mailto:${request.email}" style="color: #2563eb; text-decoration: none;">${request.email}</a>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 0; color: #6b7280; font-weight: 500;">
                    <span style="margin-right: 8px;">🔐</span> Password:
                  </td>
                  <td style="padding: 12px 0; color: #111827; text-align: right; font-family: monospace;">${tempPassword}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 0; color: #6b7280; font-weight: 500;">
                    <span style="margin-right: 8px;">🧪</span> Role:
                  </td>
                  <td style="padding: 12px 0; text-align: right;">
                    <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500;">Tester</span>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 0; color: #6b7280; font-weight: 500;">
                    <span style="margin-right: 8px;">💼</span> Plan:
                  </td>
                  <td style="padding: 12px 0; text-align: right;">
                    <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500;">${request.plan || 'Starter'}</span>
                  </td>
                </tr>
              </table>
              
              <div style="margin-top: 24px; padding: 16px; background: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  <strong>ℹ️ Note:</strong> This account has "tester" role and can access both web dashboard and mobile app.
                </p>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated notification from the Dinery platform.</p>
            </div>
          </div>`,
        },
      });

      // Send welcome email to user
      await addDoc(collection(db, "mail"), {
        to: [request.email],
        message: {
          subject: "Welcome to Dinery.ai - Your Test Account is Ready",
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Welcome to Dinery.ai</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px;">
              <p style="font-size: 16px; color: #111827; margin: 0 0 16px 0;">Hi ${request.firstName},</p>
              
              <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Great news! Your test account has been approved and created. You can now access both our web dashboard and mobile app with the same credentials.
              </p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; text-align: center;">🧪 Your Test Account</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Email:</td>
                    <td style="padding: 8px 0; color: #111827; text-align: right;">${request.email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Password:</td>
                    <td style="padding: 8px 0; color: #111827; text-align: right; font-family: monospace; font-weight: 600;">${tempPassword}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Role:</td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">Tester</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Plan:</td>
                    <td style="padding: 8px 0; color: #111827; text-align: right;">${request.plan || 'Starter'}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #dbeafe; padding: 16px; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  <strong>✨ Access Both Platforms:</strong> Use these credentials to log in to both the web dashboard and the mobile app. Your tester account has full access to test all features.
                </p>
              </div>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="https://dinery-ai.netlify.app/" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  Access Web Dashboard
                </a>
              </div>
              
              <p style="font-size: 14px; color: #4b5563; margin: 24px 0 0 0;">
                Best regards,<br>
                The Dinery.ai Team
              </p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated email from the Dinery.ai platform.</p>
            </div>
          </div>`,
        },
      });

      alert("Test account approved! Account created with 'tester' role, and emails sent.");
    } catch (error) {
      console.error("Error approving request:", error);
      alert(`Failed to approve request: ${error.message}`);
    }
  };

  const handleReject = async (request) => {
    if (!window.confirm("Are you sure you want to reject this request?")) return;

    try {
      await updateDoc(doc(db, "AccountRequestTesting", request.id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });

      // Fetch admin emails
      const adminEmailsSnapshot = await getDocs(collection(db, 'AdminEmail'));
      const adminEmails = adminEmailsSnapshot.docs.map(doc => doc.data().Email);

      // Send notification to admin
      await addDoc(collection(db, "mail"), {
        to: adminEmails,
        message: {
          subject: `❌ Test Account Rejected - ${request.firstName} ${request.lastName}`,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">❌ Test Account Rejected</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px;">
              <p style="font-size: 14px; color: #4b5563; margin: 0 0 16px 0;">
                Test account request from <strong>${request.firstName} ${request.lastName}</strong> (${request.email}) has been rejected.
              </p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated notification from the Dinery platform.</p>
            </div>
          </div>`,
        },
      });

      // Send rejection email to user
      await addDoc(collection(db, "mail"), {
        to: [request.email],
        message: {
          subject: "Test Account Request Update - Dinery.ai",
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Test Account Request Update</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px;">
              <p style="font-size: 16px; color: #111827; margin: 0 0 16px 0;">Hi ${request.firstName},</p>
              
              <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Thank you for your interest in Dinery.ai. Unfortunately, we are unable to approve your test account request at this time.
              </p>
              
              <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                If you have any questions or would like to discuss this further, please don't hesitate to contact our support team.
              </p>
              
              <p style="font-size: 14px; color: #4b5563; margin: 24px 0 0 0;">
                Best regards,<br>
                The Dinery.ai Team
              </p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated email from the Dinery.ai platform.</p>
            </div>
          </div>`,
        },
      });

      alert("Request rejected and email sent to user!");
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request");
    }
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm("Are you sure you want to delete this request? This action cannot be undone.")) return;

    try {
      await deleteDoc(doc(db, "AccountRequestTesting", requestId));
      alert("Request deleted successfully!");
    } catch (error) {
      console.error("Error deleting request:", error);
      alert("Failed to delete request");
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filter === "all") return true;
    return req.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <FiCheckCircle className="mr-1" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <FiXCircle className="mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <FiClock className="mr-1" />
            Pending
          </span>
        );
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Account Requests</h1>
        <p className="text-gray-600">Manage and review test account requests from restaurants</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Total Requests</div>
          <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {requests.filter((r) => r.status === "pending" || !r.status).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Approved</div>
          <div className="text-2xl font-bold text-green-600">
            {requests.filter((r) => r.status === "approved").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Rejected</div>
          <div className="text-2xl font-bold text-red-600">
            {requests.filter((r) => r.status === "rejected").length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "all"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "pending"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Pending ({requests.filter((r) => r.status === "pending" || !r.status).length})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "approved"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Approved ({requests.filter((r) => r.status === "approved").length})
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "rejected"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Rejected ({requests.filter((r) => r.status === "rejected").length})
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restaurant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {request.firstName} {request.lastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <FiGlobe className="mr-1" />
                            <a
                              href={request.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {request.website}
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center text-gray-900 mb-1">
                          <FiMail className="mr-2 text-gray-400" />
                          {request.email}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <FiPhone className="mr-2 text-gray-400" />
                          {request.contact}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {request.plan || "Starter"}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(request.status || "pending")}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {(!request.status || request.status === "pending") && (
                          <>
                            <button
                              onClick={() => handleApprove(request)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <FiCheckCircle size={18} />
                            </button>
                            <button
                              onClick={() => handleReject(request)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <FiXCircle size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(request.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TestAccountRequestsPage;