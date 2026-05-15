import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/shared/Layout";
import FleetView from "./components/FleetView/FleetView";
import DiagnosticsView from "./components/DiagnosticsView/DiagnosticsView";
import NodeDetail from "./components/NodeDetail/NodeDetail";
import CompareView from "./components/CompareView/CompareView";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <FleetView />,
      },
      {
        path: "compare",
        element: <CompareView />,
      },
      {
        path: "nodes/:nodeId",
        element: <NodeDetail />,
      },
      {
        // Operator-only: not linked from nav, reachable by URL
        path: "diagnostics",
        element: <DiagnosticsView />,
      },
    ],
  },
]);
