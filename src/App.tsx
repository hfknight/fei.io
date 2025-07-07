import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import Layout from './components/Layout/Layout';
import About from './pages/About';
import Home from './pages/Day';
import Loading from './pages/Loading';
// import Projects from './pages/Projects';
// import Contact from './pages/Contact';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/load" element={<Loading />} />
            {/* <Route path="/projects" element={<Projects />} /> */}
            {/* <Route path="/contact" element={<Contact />} /> */}
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;