import React, { useState, useEffect } from "react";
import { db } from "../Firebase/config";
import { collection, query, where, getDocs, doc, deleteDoc, Timestamp } from "firebase/firestore";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./ReportsPage.css";

const ReportsPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [pin, setPin] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);

  const reportsPerPage = 22;

  useEffect(() => {
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const reportsRef = collection(db, "Reports");
      let q = query(reportsRef, where("patientId", "==", patientId));

      // Get all reports first
      const querySnapshot = await getDocs(q);
      let reportsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        // Convert Firestore Timestamp to JavaScript Date
        const submittedAt = data.submittedAt?.toDate 
          ? data.submittedAt.toDate() 
          : new Date(data.submittedAt);
        
        return {
          id: doc.id,
          ...data,
          submittedAt,
          // Add date string for easy filtering (YYYY-MM-DD format)
          submittedDate: submittedAt.toISOString().split('T')[0]
        };
      });

      // Apply client-side date filtering
      if (startDate || endDate) {
        reportsData = reportsData.filter(report => {
          const reportDate = report.submittedDate;
          const start = startDate || '1970-01-01'; // Default to earliest possible date
          const end = endDate || '9999-12-31'; // Default to far future date
          return reportDate >= start && reportDate <= end;
        });
      }

      // Apply type filter if selected
      if (typeFilter) {
        reportsData = reportsData.filter(report => report.formType === typeFilter);
      }

      // Sort reports
      reportsData.sort((a, b) => {
        return sortOrder === "asc" 
          ? a.submittedAt - b.submittedAt 
          : b.submittedAt - a.submittedAt;
      });

      setReports(reportsData);
    } catch (error) {
      console.error("Error fetching reports: ", error);
      setError("Failed to load reports. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  fetchReports();
}, [patientId, startDate, endDate, typeFilter, sortOrder]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const totalPages = Math.ceil(reports.length / reportsPerPage);
  const currentReports = reports.slice(
    (currentPage - 1) * reportsPerPage,
    currentPage * reportsPerPage
  );

  const getReportDetailsRoute = (formType, reportId) => {
    switch (formType) {
      case "NHC":
        return `/main/reportsdetailnhc/${reportId}`;
      case "NHC(E)":
        return `/main/reportsdetailnhce/${reportId}`;
      case "DHC":
        return `/main/report-details-dhc/${reportId}`;
      case "PROGRESSION REPORT":
        return `/main/report-details-progression/${reportId}`;
      case "SOCIAL REPORT":
        return `/main/report-details-social/${reportId}`;
      case "VHC":
        return `/main/report-details-vhc/${reportId}`;
      case "GVHC":
        return `/main/report-details-vhc/${reportId}`;
      case "INVESTIGATION":
        return `/main/report-details-investigation/${reportId}`;
      case "DEATH":
        return `/main/report-details-death/${reportId}`;
      default:
        return `/main/report-details-default/${reportId}`;
    }
  };

  const handleDeleteClick = (reportId) => {
    setReportToDelete(reportId);
    setShowConfirmation(true);
  };

  const handlePinChange = (e) => {
    setPin(e.target.value);
  };

  const handleConfirmDelete = async () => {
    if (pin === "2012") {
      try {
        await deleteDoc(doc(db, "Reports", reportToDelete));
        setReports(reports.filter((report) => report.id !== reportToDelete));
        setShowConfirmation(false);
        setPin("");
        toast.success("Report deleted successfully!");
      } catch (error) {
        console.error("Error deleting report: ", error);
        toast.error("Failed to delete report.");
      }
    } else {
      toast.error("Incorrect PIN.");
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmation(false);
    setPin("");
  };

  const addSectionHeader = (printWindow, text) => {
    printWindow.document.write(`<div class="section-header">${text}</div>`);
  };

  const addTable = (printWindow, data) => {
    printWindow.document.write(`
      <table>
        <tbody>
          ${data.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    `);
  };

  const handlePrintAll = async () => {
    if (reports.length === 0) {
      toast.warning("No reports to print");
      return;
    }

    // Use the already filtered reports from state
    const reportsToPrint = reports.filter(report => 
      report.formType === "NHC" || 
      report.formType === "NHC(E)" || 
      report.formType === "DHC"
    );

    if (reportsToPrint.length === 0) {
      toast.warning("No NHC/NHC(E)/DHC reports to print in the selected date range");
      return;
    }

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>NHC/DHC Reports - ${patientId}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 0;
              font-size: 10px; /* <-- Change this number to make all text bigger/smaller */
            }
            .page {
              page-break-after: always;
              padding: 0.5cm; /* <-- Change this for more/less page padding */
              height: 27.7cm;
              box-sizing: border-box;
              overflow: hidden;
              width: 19cm;
              margin: 0 auto;
            }
            .page:last-child {
              page-break-after: auto;
            }
            h1 { 
              font-size: 13px; /* <-- Change this for the main title size */
              color: #283593; 
              margin-bottom: 10px; 
              text-align: center;
            }
            h2 {
              font-size: 11px; /* <-- Change this for report section title size */
              color: #283593;
              margin-bottom: 7px;
              text-align: center;
            }
            h3 {
              font-size: 10px; /* <-- Change this for sub-section title size */
              margin-bottom: 5px;
            }
            .section-header { 
              font-size: 9px; /* <-- Change this for section header size */
              font-weight: bold; 
              background-color: #f0f0f0; 
              padding: 3px; /* <-- Change this for section header padding */
              margin-top: 7px;
              margin-bottom: 3px;
              border-bottom: 1px solid #ddd;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 5px;
              page-break-inside: avoid;
              font-size: 9px; /* <-- Change this for table text size */
            }
            table, th, td { 
              border: 1px solid #ddd; 
            }
            th, td { 
              padding: 3px 5px; /* <-- Change these numbers for table cell padding */
              text-align: left; 
              font-size: 9px; /* <-- Change this for table cell text size */
            }
            th { 
              background-color: #f5f5f5; 
            }
            tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
            @page {
              size: A4;
              margin: 1cm;
            }
            @media print {
              body { 
                margin: 0;
                padding: 0;
              }
              .page {
                margin: 0;
                padding: 0.5cm;
                box-shadow: none;
                height: 27.7cm;
                width: 19cm;
                overflow: hidden;
                page-break-after: always;
              }
              .page:last-child {
                page-break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          <h1>NHC/DHC Reports for Patient ID: ${patientId}</h1>
          <p style="text-align: center;">
            Showing ${reportsToPrint.length} reports 
            ${startDate || endDate ? `(Filtered: ${startDate ? `From ${new Date(startDate).toLocaleDateString()}` : ''} ${endDate ? `To ${new Date(endDate).toLocaleDateString()}` : ''})` : ''}
            (Printed on ${new Date().toLocaleDateString()})
          </p>
    `);

    reportsToPrint.forEach((report, index) => {
      printWindow.document.write(`
        <div class="page">
          <h2>${report.formType} Report ${index + 1}</h2>
          <h3>Patient: ${report.name || "No Name"}</h3>
          <p><strong>Date:</strong> ${report.submittedAt ? new Date(report.submittedAt).toLocaleString() : "N/A"}</p>
      `);

      // Common fields for all reports
      addSectionHeader(printWindow, "Basic Information");
      addTable(printWindow, [
        ["Reg No", report.registernumber || "N/A"],
        ["Reported BY", report.team1 || "N/A"],
        ["Date", report.date || "N/A"],
        ["Patient Name", report.name || "N/A"],
        ["Age", report.age || "N/A"],
        ["Address", report.address || "N/A"],
        ["Main Diagnosis", report.mainDiagnosis || "N/A"],
      ]);

      // First Impression
      addSectionHeader(printWindow, "First Impression");
      addTable(printWindow, [["First Impressions", report.firstImpression || "N/A"]]);

      // Basic Matters
      addSectionHeader(printWindow, "Basic Matters");
      addTable(printWindow, [["Basic Matters Notes", report.basicMattersNotes || "N/A"]]);

      // General Matters
      addSectionHeader(printWindow, "General Matters");
      addTable(printWindow, [
        ["General Status", report.generalStatus || "N/A"],
        ["Patient Currently", report.patientCurrently || "N/A"],
        ["Activity Score", report.activityScore || "N/A"],
        ["Add More General", report.addmoregeneral || "N/A"],
      ]);

      // Vital Signs
      addSectionHeader(printWindow, "Vital Signs");
      addTable(printWindow, [
        ["BP", `${report.bp || "N/A"} mmHg - ${report.ulLl || ""} - ${report.position || ""}`],
        ["RR", `${report.rr || ""} Mt - ${report.rrType || ""}`],
        ["Pulse", `${report.pulse || ""} Mt - ${report.pulseType || ""}`],
        ["Temperature", `${report.temperature || ""} °F - ${report.temperatureType || ""}`],
        ["SpO2", `${report.spo2 || ""} %`],
        ["GCS", `${report.gcs || ""} /15`],
        ["GRBS", `${report.grbs || ""} mg/dl`],
      ]);

      // Summary Discussion
      addSectionHeader(printWindow, "Summary Discussion");
      if (report.formType === "DHC") {
        addTable(printWindow, [
          ["Discussion and Management", report.summaryDiscussion || "N/A"],
          ["Special Care Areas", report.specialCareAreas || "N/A"],
          ["ComplimentaryRx", report.complimentaryRx || "N/A"],
          ["Medicine Changes", report.medicineChanges || "N/A"],
          ["Other Activities", report.otherActivities || "N/A"],
          ["Home Care Plan", report.homeCarePlan || "N/A"],
          ["Medical Examination", report.consultation || "N/A"],
        ]);
      } else {
        addTable(printWindow, [
          ["Summary Discussion", report.summaryDiscussion || "N/A"],
          ["Special Care Areas", report.specialCareAreas || "N/A"],
          ["Medicine Changes", report.medicineChanges || "N/A"],
          ["Other Activities", report.otherActivities || "N/A"],
          ["Home Care Plan", report.homeCarePlan || "N/A"],
          ["Doctor Consultation / DHC", report.consultation || "N/A"],
        ]);
      }

      // Miscellaneous
      addSectionHeader(printWindow, "Miscellaneous");
      addTable(printWindow, [
        ["Form Type", report.formType || "N/A"],
        ["Registration Date", report.registrationDate || "N/A"],
        ["Submitted At", report.submittedAt ? new Date(report.submittedAt).toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }) : "N/A"],
        ["Team 1", report.team1 || "N/A"],
        ["Team 2", report.team2 || "N/A"],
        ["Team 3", report.team3 || "N/A"],
        ["Team 4", report.team4 || "N/A"],
      ]);

      printWindow.document.write(`</div>`);
    });

    printWindow.document.write(`</body></html>`);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setTypeFilter("");
  };

  return (
    <div className="reports-page-container">
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastStyle={{ marginTop: "20px" }}
      />

      <div className="back-button-container">
        <button onClick={() => navigate(-1)} className="back-button">
          Back
        </button>
      </div>
      <h2 className="text-white">Reports ({reports.length})</h2>

      <div className="filter-icon-container">
        <button onClick={() => setShowFilters(!showFilters)} className="filter-icon">
          {showFilters ? "Hide Filters" : "Filters"}
        </button>
      </div>

      {showFilters && (
        <div className="filters-container">
          <div className="date-filter">
  {/* <label>From:</label> */}
  <input
    type="date"
    value={startDate}
    onChange={(e) => setStartDate(e.target.value)}
    max={endDate || undefined}
  />
</div>
<div className="date-filter">
  {/* <label>To:</label> */}
  <input
    type="date"
    value={endDate}
    onChange={(e) => setEndDate(e.target.value)}
    min={startDate || undefined}
  />
</div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Select Type</option>
            <option value="NHC">NHC</option>
            <option value="NHC(E)">NHC(E)</option>
            <option value="DHC">DHC</option>
            <option value="PROGRESSION REPORT">Progression Report</option>
            <option value="SOCIAL REPORT">Social Report</option>
            <option value="VHC">VHC</option>
            <option value="GVHC">GVHC</option>
            <option value="INVESTIGATION">Investigation</option>
            <option value="DEATH">Death</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
          <button
            onClick={handlePrintAll}
            className="print-all-button btn-warning p-2 btn "
            disabled={reports.length === 0}
          >
            Print All
          </button>
          <button
            onClick={clearFilters}
            className="clear-filters-button btn-info p-2 btn"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <p>
          <div className="loading-container">
            <img
              src="https://media.giphy.com/media/YMM6g7x45coCKdrDoj/giphy.gif"
              alt="Loading..."
              className="loading-image"
            />
          </div>
        </p>
      ) : error ? (
        <p>{error}</p>
      ) : currentReports.length === 0 ? (
        <p>No reports found for this patient.</p>
      ) : (
        <div className="reports-list">
          {currentReports.map((report) => (
            <div key={report.id} className="report-item">
              <Link
                to={getReportDetailsRoute(report.formType, report.id)}
                className="report-link"
              >
                <h3>{report.formType || "Report Title"}</h3>
                <p>
                  {report.submittedAt
                    ? new Date(report.submittedAt).toLocaleString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      second: "numeric",
                      hour12: true,
                    })
                    : "No date available"}
                </p>
                <p>{report.name || "No Name"}</p>
                <p className="AllRep-report-name">REPORTED BY: {report.team1 || "NOT MENTION"}</p>
              </Link>
              <button onClick={() => handleDeleteClick(report.id)} className="delete-button">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pagination">
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>{currentPage}</span>
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      {showConfirmation && (
        <div className="confirmation-box">
          <p>Enter PIN to delete the report:</p>
          <input
            type="password"
            value={pin}
            onChange={handlePinChange}
            placeholder="Enter PIN"
          />
          <button onClick={handleConfirmDelete}>Confirm</button>
          <button onClick={handleCancelDelete}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;