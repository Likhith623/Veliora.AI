import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Upload } from "lucide-react";
import Image from "next/image";

const BotCustomization = ({ selectedBotDetails, onUpdate }) => {
  // const [isEditing, setIsEditing] = useState(false);
  const [customName, setCustomName] = useState(
    selectedBotDetails?.name || "Unnamed"
  );
  // const [customImage, setCustomImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Reset and load customizations when selected bot changes
  useEffect(() => {
    // setIsEditing(false);
    setCustomName(selectedBotDetails.name);
    loadCustomizations();
  }, [selectedBotDetails?.bot_id || "Unnamed"]);

  const loadCustomizations = () => {
    const savedCustomizations = localStorage.getItem(
      `bot_customization_${selectedBotDetails.bot_id}`
    );
    if (savedCustomizations) {
      const { name, image } = JSON.parse(savedCustomizations);
      setCustomName(name || selectedBotDetails.name);
      if (image) {
        setPreviewUrl(image);
        // setCustomImage(image);
      } else {
        setPreviewUrl(null);
        // setCustomImage(null);
      }
    } else {
      // Reset to defaults if no customizations found
      setCustomName(selectedBotDetails.name);
      setPreviewUrl(null);
      // setCustomImage(null);
    }
  };

  // const handleImageUpload = (event) => {
  //     const file = event.target.files[0];
  //     if (file) {
  //         const reader = new FileReader();
  //         reader.onloadend = () => {
  //             setPreviewUrl(reader.result);
  //             setCustomImage(reader.result);
  //         };
  //         reader.readAsDataURL(file);
  //     }
  // };

  // const handleSave = () => {
  //     const customizations = {
  //         name: customName,
  //         image: customImage
  //     };
  //     localStorage.setItem(
  //         `bot_customization_${selectedBotDetails.bot_id}`,
  //         JSON.stringify(customizations)
  //     );
  //     onUpdate(customizations);
  //     setIsEditing(false);
  // };

  // const handleCancel = () => {
  //     setIsEditing(false);
  //     loadCustomizations(); // Reset to last saved state
  // };

  return (
    <div className="relative">
      <div className="flex items-center mb-6 mt-4">
        <div className="relative">
          {(previewUrl || selectedBotDetails?.src) && (
            <Image
              src={
                previewUrl ||
                selectedBotDetails?.src ||
                "/photos/defaultforvoice.png"
              }
              alt="Bot"
              width={100}
              height={100}
              className="h-20 w-20 rounded-full object-cover object-center"
              onError={(e) => {
                console.error("Failed to load bot image:", e.target.src);
                e.target.style.display = "none";
                // Show fallback
                const fallback =
                  e.target.parentNode.querySelector(".image-fallback");
                if (fallback) fallback.style.display = "flex";
              }}
            />
          )}
          {!previewUrl && !selectedBotDetails?.src && (
            <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center image-fallback">
              <span className="text-gray-600 text-sm">No Image</span>
            </div>
          )}
          {/* Hidden fallback for when image fails to load */}
          <div
            className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center image-fallback"
            style={{ display: "none" }}
          >
            <span className="text-gray-600 text-sm">No Image</span>
          </div>
          {/* {isEditing && (
                        <label className="absolute bottom-0 right-0 cursor-pointer">
                            <div className="bg-purple-600 rounded-full p-1">
                                <Upload size={16} className="text-white" />
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </label>
                    )} */}
        </div>
        <div className="ml-3 p-3 flex-1">
          {/* {isEditing ? (
                        <Input
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="bg-white/10 text-black/70 backdrop-blur-sm border-purple-500"
                        />
                    ) : ( */}
          <h3 className="text-2xl font-bold text-foreground">{customName}</h3>
          {/* )} */}
          <p className="text-sm text-foreground whitespace-pre-line">
            {selectedBotDetails?.designation || "Unnamed"}
          </p>
        </div>
      </div>
      {/* <div className="flex gap-2">
                {isEditing ? (
                    <>
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={handleCancel}
                            className="text-gray-500 hover:bg-gray-100 hover:text-black"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={handleSave}
                            className="text-purple-500 hover:bg-gray-100 hover:text-purple"
                        >
                            Save
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        className=" bg-transparent hover:bg-transparent 
             text-purple-500 hover:text-purple-700 transition text-center w-full"
                    >
                        {isEditing ? (
                            <span className="text-purple-500">Save</span>
                        ) : (
                            // <Pencil size={16} className="text-purple-500" />
                            <div className={"py-3 w-full bg-gradient-to-r  from-purple-400/80 via-pink-400/80  to-orange-400/80 hover:from-purple-400/90 hover:via-pink-400/90 hover:to-orange-400/90 hover:opacity-80 text-white rounded-full flex justify-center items-center gap-2 transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)]"} variant="ghost" size="icon" onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
                                <Pencil size={16} className="text-white" />
                                <span className="text-white mt-[-2px] text-[16px]">Edit</span>
                            </div>
                        )}
                    </Button>
                )}
            </div> */}
    </div>
  );
};

export default BotCustomization;
