
import React, { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Agent {
  id: string;
  name: string;
}

const AgentSelector: React.FC = () => {
  const agents: Agent[] = [
    { id: "1", name: "Data Analyst" },
    { id: "2", name: "SQL Expert" },
    { id: "3", name: "Visualization" },
    { id: "4", name: "ML Engineer" },
  ];

  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const addAgent = (agent: Agent) => {
    if (!selectedAgents.find((a) => a.id === agent.id)) {
      setSelectedAgents((prev) => [...prev, agent]);
    }
    setShowDropdown(false);
  };

  const removeAgent = (id: string) => {
    setSelectedAgents((prev) => prev.filter((a) => a.id !== id));
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <div className="relative inline-block w-full max-w-sm">
      {/* Button + Tags */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => setShowDropdown((prev) => !prev)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {selectedAgents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-1 bg-secondary rounded-full px-3 py-1 text-sm text-secondary-foreground"
            >
              <span>{agent.name}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeAgent(agent.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dropdown above the button */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full mb-2 z-50 w-56 max-h-60 overflow-auto rounded-md border bg-popover p-2 text-popover-foreground shadow-md animate-in fade-in slide-in-from-bottom-1 left-0"
        >
          {agents.filter((a) => !selectedAgents.some((s) => s.id === a.id)).length > 0 ? (
            agents
              .filter((a) => !selectedAgents.some((s) => s.id === a.id))
              .map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => addAgent(agent)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm"
                >
                  {agent.name}
                </button>
              ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              All agents selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentSelector;

