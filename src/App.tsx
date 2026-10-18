import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Simulator } from './pages/Simulator';
import { Learn } from './pages/Learn';
import { Demo } from './pages/Demo';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="tools/challenge-fit-simulator" element={<Simulator />} />
        <Route path="learn/:slug" element={<Learn />} />
        <Route path="demo" element={<Demo />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
