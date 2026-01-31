import { useLocation, Link } from 'react-router-dom';

const CheckEmail = () => {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/20 mb-8">
          <svg
            className="w-12 h-12 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-5">
          Check your email
        </h1>
        <p className="text-lg text-muted-foreground mb-5">
          We've sent a confirmation link to
          {email ? (
            <span className="font-medium text-foreground"> {email}</span>
          ) : (
            ' your email'
          )}
          . Click the link to activate your account—you'll be taken to your dashboard.
        </p>
        <p className="text-base text-muted-foreground mb-10">
          You can close this tab and open the link from your email. If you don't see the email, check your spam folder.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
};

export default CheckEmail;
