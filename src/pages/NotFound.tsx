import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page notfound">
      <h1>404</h1>
      <p>That page doesn't exist.</p>
      <Link to="/" className="btn btn-primary">Back to dashboard</Link>
    </div>
  );
}
