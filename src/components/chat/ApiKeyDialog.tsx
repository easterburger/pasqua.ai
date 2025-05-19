"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_KEY_LOCAL_STORAGE_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeySave: (apiKey: string) => void;
}

export function ApiKeyDialog({ open, onOpenChange, onApiKeySave }: ApiKeyDialogProps) {
  const [apiKeyInput, setApiKeyInput] = React.useState("");
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      const storedKey = localStorage.getItem(API_KEY_LOCAL_STORAGE_KEY);
      if (storedKey) {
        setApiKeyInput(storedKey);
      } else {
        // Pre-fill with the key from the prompt if it was intended for user convenience
        // setApiKeyInput("AIzaSyCyLRQ0P9FFVW3mbHeoBhlFN1LNg-R2QKk"); 
        setApiKeyInput(""); // Or leave blank for user to fill
      }
    }
  }, [open]);

  const handleSave = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem(API_KEY_LOCAL_STORAGE_KEY, apiKeyInput.trim());
      onApiKeySave(apiKeyInput.trim());
      toast({
        title: "API Key Saved",
        description: "Your Gemini API key has been saved successfully.",
      });
      onOpenChange(false);
    } else {
      toast({
        title: "Error",
        description: "API Key cannot be empty.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <KeyRound className="mr-2 h-5 w-5" />
            Set Gemini API Key
            </DialogTitle>
          <DialogDescription>
            Enter your Gemini API key to enable chat functionality. Your key will be stored locally in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="apiKey" className="text-right">
              API Key
            </Label>
            <Input
              id="apiKey"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="col-span-3"
              type="password"
              placeholder="Enter your Gemini API Key"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSave}>Save API Key</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
