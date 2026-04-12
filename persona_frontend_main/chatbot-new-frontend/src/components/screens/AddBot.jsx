import React from "react";
import { SelectBot } from "../SelectBot";

function AddBot({ onClose }) {
  return (
    <div className="w-max">
      <SelectBot onClose={onClose} color="#F2F2F2" />
    </div>
  );
}

export default AddBot;
