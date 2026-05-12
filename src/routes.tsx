import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/shared/Layout";
import FleetView from "./components/FleetView/FleetView";
import DiagnosticsView from "./components/DiagnosticsView/DiagnosticsView";
import NodeDetail from "./components/NodeDetail/NodeDetail";

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
