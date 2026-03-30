import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import Layout from './components/Layout/Layout';
import About from './pages/About';
import Day from './pages/Day';
import LandingPage from './components/Landing';
import LoadingScreen from './components/Landing/LoadingScreen';
import Contact from './pages/Contact';
import Work from './pages/Work';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/readme" element={<About />} />
            <Route path="/changelog" element={<Day />} />
            <Route path="/work" element={<Work />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/loading" element={<LoadingScreen isVisible={true} />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
