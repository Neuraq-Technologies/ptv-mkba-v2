import React from "react";
import { useNavigate } from "react-router-dom";
import "./ComingSoon.css";

const SimpleComingSoon = () => {
  const navigate = useNavigate();

  return (
    <div className="simple-coming-soon">
      <div className="simple-content">
        <h1>Coming Soon</h1>
        <p>We're working on something awesome!</p>
        <button 
          className="simple-back-button" 
          onClick={() => navigate(-1)}
        >
          ← Go Back
        </button>
      </div>
    </div>
  );
};

export default SimpleComingSoon;