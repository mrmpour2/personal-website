import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Layout } from "@/components/Layout";
import { PageLoader } from "@/components/PageLoader";

const HomePage = lazy(() => import("@/pages/HomePage"));
const MenuPage = lazy(() => import("@/pages/MenuPage"));
const ProductPage = lazy(() => import("@/pages/ProductPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const OrderDetailsPage = lazy(() => import("@/pages/OrderDetailsPage"));
const LoyaltyPage = lazy(() => import("@/pages/LoyaltyPage"));
const BlogPage = lazy(() => import("@/pages/BlogPage"));
const BlogPostPage = lazy(() => import("@/pages/BlogPostPage"));
const PolicyPage = lazy(() => import("@/pages/PolicyPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const FaqPage = lazy(() => import("@/pages/FaqPage"));
const SupportPage = lazy(() => import("@/pages/SupportPage"));
const TicketTrackingPage = lazy(() => import("@/pages/TicketTrackingPage"));
const SurveyPage = lazy(() => import("@/pages/SurveyPage"));

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="menu" element={<MenuPage />} />
              <Route path="menu/:id" element={<ProductPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="order/:id" element={<OrderDetailsPage />} />
              <Route path="shipping-policy" element={<PolicyPage />} />
              <Route path="return-policy" element={<PolicyPage />} />
              <Route path="privacy-policy" element={<PolicyPage />} />
              <Route path="loyalty" element={<LoyaltyPage />} />
              <Route path="blog" element={<BlogPage />} />
              <Route path="blog/:id" element={<BlogPostPage />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="support/track" element={<TicketTrackingPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="survey/:token" element={<SurveyPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
