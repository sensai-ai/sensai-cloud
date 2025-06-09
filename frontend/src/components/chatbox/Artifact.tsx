import { useState } from "react";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Expand,
  X,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartToolTip,
  Legend,
} from "chart.js";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"; // You can change the theme
import { toast } from "sonner";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartToolTip,
  Legend,
);

// ... rest of your imports ...

const BarChart = ({ artifact }: { artifact: ArtifactData }) => {
  // Prepare data for the chart
  const labels = artifact.data_samples.map(
    (item, index) =>
      item.Name || item[artifact.columns[0]] || `Item ${index + 1}`,
  );

  // Find the numeric column to use as values
  const valueColumn =
    artifact.columns.find((col) =>
      artifact.data_samples.some((item) => typeof item[col] === "number"),
    ) || artifact.columns[1];

  const data = {
    labels,
    datasets: [
      {
        label: valueColumn,
        data: artifact.data_samples.map((item) => item[valueColumn]),
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
    ],
  };

  console.log({ data });

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: artifact.name,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || "";
            const value = context.raw;
            const allData = artifact.data_samples[context.dataIndex];
            const additionalInfo = Object.entries(allData)
              .filter(([key]) => key !== valueColumn && key !== "Name")
              .map(([key, val]) => `${key}: ${val}`)
              .join("\n");

            return [`${label}: ${value}`, additionalInfo];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: valueColumn,
        },
      },
      x: {
        title: {
          display: true,
          text: "Items",
        },
      },
    },
  };

  return (
    <div className="h-full w-full p-4">
      <Bar data={data} options={options} />
    </div>
  );
};

export type ArtifactData = {
  id: string;
  name: string;
  description: string;
  sql_query: string;
  columns: string[];
  data_samples: any[];
  visualization_type: string[];
  row_count: number;
};

type ArtifactProps = {
  artifacts: ArtifactData[] | null;
  onClose: () => void;
  className?: string;
};

export function Artifact({
  artifacts,
  onClose,
  className = "",
}: ArtifactProps) {
  const [activeTab, setActiveTab] = useState("graph");
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState<number>(0);

  if (!artifacts) return null;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  function moveToNextArtifact() {
    if (!artifacts) return;
    if (selectedArtifactIndex === artifacts?.length - 1) return;
    setSelectedArtifactIndex((prev) => prev + 1);
  }

  function moveToPrevArtifact() {
    if (!artifacts) return;
    if (selectedArtifactIndex === 0) return;
    setSelectedArtifactIndex((prev) => prev - 1);
  }

  const downloadCSV = () => {
    // Convert data to CSV format
    const headers = artifacts[selectedArtifactIndex].columns.join(",");
    const rows = artifacts[selectedArtifactIndex].data_samples
      .map((row) =>
        artifacts[selectedArtifactIndex].columns
          .map((col) => JSON.stringify(row[col]))
          .join(","),
      )
      .join("\n");

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifacts[selectedArtifactIndex].name.replace(/ /g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`flex flex-col border rounded-lg w-[40%] bg-background overflow-scroll ${className} "max-h-[100vh]"`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-secondary">
            <img
              src="/static/images/csv-logo.png"
              alt="CSV"
              className="h-5 w-5"
            />
          </div>
          <h2 className="text-sm font-medium line-clamp-1">
            {artifacts[selectedArtifactIndex].name}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger disabled={selectedArtifactIndex === 0} asChild>
              <Button
                onClick={moveToPrevArtifact}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous Artifact</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              disabled={selectedArtifactIndex === artifacts?.length - 1}
              asChild
            >
              <Button
                onClick={moveToNextArtifact}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next Artifact</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={downloadCSV}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download data</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hidden md:inline-flex"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <Expand className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isExpanded ? "Minimize" : "Expand"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col ">
        {/* Tabs and Actions */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex-1"
        >
          <div className="flex items-center justify-between p-2 border-b">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="graph" className="h-7 text-xs">
                Graph
              </TabsTrigger>
              <TabsTrigger value="table" className="h-7 text-xs">
                Table
              </TabsTrigger>
              <TabsTrigger value="query" className="h-7 text-xs">
                Query
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="graph" className="h-full m-0">
              {artifacts[selectedArtifactIndex].data_samples.length > 0 ? (
                <BarChart artifact={artifacts[selectedArtifactIndex]} />
              ) : (
                <div className="h-full p-4 flex items-center justify-center bg-muted/50">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      No data available for visualization
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="table" className="h-full m-0">
              <ScrollArea className="max-h-[85vh] overflow-scroll">
                <div className="w-full overflow-x-scroll">
                <div className="min-w-max">
                  <Table className="border-b  ">
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        {artifacts[selectedArtifactIndex].columns.map(
                          (column, index) => (
                            <TableHead key={index} className="px-4 py-2">
                              {column}
                            </TableHead>
                          ),
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {artifacts[selectedArtifactIndex].data_samples.map(
                        (row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {artifacts[selectedArtifactIndex].columns.map(
                              (column) => (
                                <TableCell
                                  key={`${rowIndex}-${column}`}
                                  className="px-4 py-2"
                                >
                                  {String(row[column])}
                                </TableCell>
                              ),
                            )}
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    Showing{" "}
                    {artifacts[selectedArtifactIndex].data_samples.length} of{" "}
                    {artifacts[selectedArtifactIndex].row_count} rows
                  </div>
</div>
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="query" className="h-full m-0">
              <ScrollArea className="h-full p-4">
                <div className="relative bg-muted rounded-md p-4">
                  {/* Copy Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute curson-pointer top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        artifacts[selectedArtifactIndex].sql_query || "",
                      );
                      toast.success("SQL copied!"); // Optional feedback
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>

                  {/* SQL Syntax Highlighter */}
                  <SyntaxHighlighter
                    language="sql"
                    style={oneDark}
                    lineProps={{
                      style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
                    }}
                    wrapLines
                    customStyle={{
                      background: "transparent",
                      padding: 0,
                      margin: 0,
                      fontSize: "0.875rem", // optional tweak for readability
                    }}
                    PreTag="div" // Enable line wrapping properly
                  >
                    {artifacts[selectedArtifactIndex].sql_query}
                  </SyntaxHighlighter>
                </div>
              </ScrollArea>
            </TabsContent>{" "}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
