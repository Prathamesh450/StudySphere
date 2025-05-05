import React, { useState, useRef, ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  accept?: string;
  maxSize?: number; // Size in MB
  onFileSelect: (file: File | null) => void;
  error?: string;
}

export function FileUpload({
  className,
  label = "Upload a file",
  accept = ".pdf,.doc,.docx,.ppt,.pptx,.txt",
  maxSize = 10, // Default max file size 10MB
  required,
  onFileSelect,
  error,
  ...props
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeInBytes = maxSize * 1024 * 1024;

  const validateFile = (file: File): boolean => {
    console.log("Validating file:", file.name);
    console.log("File size:", file.size, "Max allowed:", maxSizeInBytes);
    
    if (file.size > maxSizeInBytes) {
      console.log("File size exceeds limit");
      setUploadError(`File size exceeds ${maxSize}MB limit`);
      return false;
    }
    
    // Check if the file type is in the accepted formats
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = accept.split(',').map(type => 
      type.trim().replace('.', '').toLowerCase()
    );
    
    console.log("File type:", fileType, "Accepted types:", acceptedTypes);
    
    if (fileType && !acceptedTypes.includes(fileType)) {
      console.log("File type not accepted");
      setUploadError(`File type .${fileType} is not supported`);
      return false;
    }
    
    setUploadError(null);
    return true;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("File selected:", file.name, "Size:", file.size, "Type:", file.type);
      
      if (validateFile(file)) {
        console.log("File validation passed, setting selected file");
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        console.log("File validation failed, clearing selection");
        e.target.value = '';
        setSelectedFile(null);
        onFileSelect(null);
      }
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      console.log("File dropped:", file.name, "Size:", file.size, "Type:", file.type);
      
      if (validateFile(file)) {
        console.log("Dropped file validation passed, setting selected file");
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        console.log("Dropped file validation failed");
        onFileSelect(null);
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
    onFileSelect(null);
    setUploadError(null);
  };

  const formatFileSize = (bytes: number): string => {
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    return (kb / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={props.id || "file-upload"}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50",
          selectedFile ? "bg-muted/20" : ""
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept={accept}
          id={props.id || "file-upload"}
          {...props}
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center">
            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm font-medium mb-1">Drag & drop or click to upload</p>
            <p className="text-xs text-muted-foreground">
              {accept ? `Supported formats: ${accept}` : "Any file format"}
            </p>
            <p className="text-xs text-muted-foreground">
              (Max size: {maxSize}MB)
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-background rounded-md p-3">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-primary mr-3" />
              <div className="text-left">
                <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={removeFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {(uploadError || error) && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError || error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
