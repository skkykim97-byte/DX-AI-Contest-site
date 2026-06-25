import { NavLink, Outlet } from 'react-router-dom';

const HEADER_HEIGHT = 64;

/**
 * Shared application shell: a fixed top header with the contest title and
 * navigation tabs (아카이빙 / 투표 / 결과), plus a centered content area
 * constrained to a maximum width of 1200px. Optimized for PC viewports
 * (minimum width 1024px).
 */
function Layout() {
  return (
    <div style={rootStyle}>
      <header style={headerStyle}>
        <div style={headerInnerStyle}>
          <NavLink to="/" style={titleStyle}>
            🏆 DX팀 AI 바이브 코딩 콘테스트
          </NavLink>
          <nav style={navStyle}>
            <NavLink to="/admin" style={navLinkStyle}>
              관리자 어드민
            </NavLink>
            <NavLink to="/" end style={navLinkStyle}>
              아카이빙
            </NavLink>
            <NavLink to="/vote" style={navLinkStyle}>
              투표
            </NavLink>
            <NavLink to="/result" style={navLinkStyle}>
              결과
            </NavLink>
          </nav>
        </div>
      </header>

      <main style={mainStyle}>
        <div style={contentStyle}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const rootStyle: React.CSSProperties = {
  minWidth: '1024px',
  minHeight: '100vh',
  backgroundColor: '#f9fafb',
};

const headerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: `${HEADER_HEIGHT}px`,
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  zIndex: 100,
};

const headerInnerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  height: '100%',
  margin: '0 auto',
  padding: '0 32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#111827',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

/**
 * NavLink style callback: highlights the active tab. react-router-dom passes
 * an { isActive } argument to the style function.
 */
function navLinkStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    textDecoration: 'none',
    color: isActive ? '#ffffff' : '#4b5563',
    backgroundColor: isActive ? '#2563eb' : 'transparent',
    transition: 'background-color 0.15s ease, color 0.15s ease',
  };
}

const mainStyle: React.CSSProperties = {
  paddingTop: `${HEADER_HEIGHT}px`,
};

const contentStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
};

export default Layout;
