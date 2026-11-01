import { Navigate, Route, Routes } from "react-router-dom";
import { Layout, RequireAuth } from "./components/Layout";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Mine from "./pages/Mine";
import Submit from "./pages/Submit";
import Viewer from "./pages/Viewer";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Viewer />} />
        <Route path="login" element={<Login />} />
        <Route
          path="submit"
          element={
            <RequireAuth>
              <Submit />
            </RequireAuth>
          }
        />
        <Route
          path="mine"
          element={
            <RequireAuth>
              <Mine />
            </RequireAuth>
          }
        />
        <Route
          path="admin"
          element={
            <RequireAuth admin>
              <Admin />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
