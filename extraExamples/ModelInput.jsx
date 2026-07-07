import React, { useState } from "react";

export default function ModelInput() {
  const [value, setValue] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      if (!value.trim()) {
        setError("Error: Input cannot be empty");
        return;
      }
      setError("");
      setResults([...results, value.trim()]);
      setValue("");
    }
  };

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Enter model ID or query"
      />
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div>
        {results.map((r, i) => (
          <div key={i} style={{ paddingLeft: 0 }}>{r}</div>
        ))}
      </div>
    </div>
  );
}

// with React Router v6, add into routes.js
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import ModelInput from "./ModelInput";

// export default function AppRoutes() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<ModelInput />} />
//         {/* add other routes here */}
//       </Routes>
//     </BrowserRouter>
//   );
// }