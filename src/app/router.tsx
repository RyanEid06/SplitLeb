import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { BillWorkspacePage } from "../pages/BillWorkspacePage";
import { HistoryPage } from "../pages/HistoryPage";
import { HomePage } from "../pages/HomePage";
import { NewBillPage } from "../pages/NewBillPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ReviewPage } from "../pages/ReviewPage";
import { SavedGroupsPage } from "../pages/SavedGroupsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "bills/new",
        element: <NewBillPage />,
      },
      {
        path: "groups",
        element: <SavedGroupsPage />,
      },
      {
        path: "bills/:billId",
        element: <BillWorkspacePage />,
      },
      {
        path: "bills/:billId/workspace",
        element: <BillWorkspacePage />,
      },
      {
        path: "bills/:billId/review",
        element: <ReviewPage />,
      },
      {
        path: "history",
        element: <HistoryPage />,
      },
      {
        path: "404",
        element: <NotFoundPage />,
      },
      {
        path: "*",
        element: <Navigate to="/404" replace />,
      },
    ],
  },
]);