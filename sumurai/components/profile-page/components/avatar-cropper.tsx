"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AvatarCropperProps {
  imageFile: File;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

export default function AvatarCropper({ imageFile, onCrop, onCancel }: AvatarCropperProps) {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const CROP_SIZE = 200; // Size of the circular crop area

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // Handle wheel event with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prev) => Math.max(0.5, Math.min(3, prev * delta)));
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelEvent);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const cropImage = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;
    const container = containerRef.current;
    if (!container) return;

    // Container center (where crop circle is)
    const containerCenterX = container.offsetWidth / 2;
    const containerCenterY = container.offsetHeight / 2;

    // Image is centered at 50% with transform offset
    // Calculate where the crop center is in the original image coordinates
    // Image is centered, so we need to account for the position offset and scale
    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;
    
    // The crop center in image coordinates
    // Position offset is relative to the centered image
    const cropCenterX = (imgNaturalWidth / 2) - (position.x / scale);
    const cropCenterY = (imgNaturalHeight / 2) - (position.y / scale);

    // Set canvas size
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw cropped image - source is the crop area in the original image
    const sourceSize = CROP_SIZE / scale;
    ctx.drawImage(
      img,
      cropCenterX - sourceSize / 2,
      cropCenterY - sourceSize / 2,
      sourceSize,
      sourceSize,
      0,
      0,
      CROP_SIZE,
      CROP_SIZE
    );

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error("Failed to create blob from canvas");
        return;
      }
      const croppedFile = new File([blob], `avatar-${Date.now()}.png`, { type: "image/png" });
      onCrop(croppedFile);
    }, "image/png", 0.95); // Use high quality
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Crop Profile Picture</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Image - positioned behind the circle */}
          {imageSrc && (
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop"
              className="absolute select-none z-0"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                transformOrigin: "center center",
                minWidth: "100%",
                minHeight: "100%",
              }}
              draggable={false}
            />
          )}

          {/* Crop overlay circle - on top of image */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div
              className="absolute border-2 border-[#00F5FF] rounded-full"
              style={{
                width: CROP_SIZE,
                height: CROP_SIZE,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={cropImage} className="bg-[#00F5FF] text-black hover:bg-[#06B6D4]">
            Use This Picture
          </Button>
        </div>

        <p className="text-sm text-gray-400 mt-4 text-center">
          Drag to move • Scroll to zoom
        </p>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

