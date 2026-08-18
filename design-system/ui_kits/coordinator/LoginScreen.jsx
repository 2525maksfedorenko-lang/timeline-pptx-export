const { Button, Input, FormItem, FormControl, FormMessage, Link, Icon } = window.AicooCoordinatorDesignSystem_42e5f1;

function LoginScreen({ onSignIn }) {
  const [email, setEmail] = React.useState("maria.lang@acme.example");
  const [pw, setPw] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!pw) { setError("Password is required"); return; }
    onSignIn();
  };
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "hsl(var(--background))" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", margin: "0 auto", padding: 16, maxWidth: 384, minHeight: "100vh", boxSizing: "border-box" }}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <img src="../../assets/aicoo-logo-orbit-darkblue-outline-lightblue-text.svg" alt="aicoo Logo" style={{ height: 48, width: "auto" }} />
          </div>
          <FormItem>
            <FormControl><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /></FormControl>
          </FormItem>
          <FormItem>
            <FormControl>
              <div style={{ position: "relative" }}>
                <Input type={show ? "text" : "password"} value={pw} onChange={(e) => { setPw(e.target.value); setError(""); }} placeholder="Password" invalid={!!error} />
                <button type="button" onClick={() => setShow(!show)} aria-label="Toggle password"
                  style={{ position: "absolute", right: 0, top: 0, height: 40, width: 44, border: "none", background: "transparent", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}>
                  <Icon name={show ? "eye-off" : "eye"} />
                </button>
              </div>
            </FormControl>
            <FormMessage>{error}</FormMessage>
          </FormItem>
          <Link href="#" style={{ width: "100%", textAlign: "center" }}>Forgot password?</Link>
          <Button type="submit" onClick={submit}>Log In</Button>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: "var(--text-sm)" }}>
            Don't have an account? <Link href="#">Sign up</Link>
          </div>
        </form>
        <div style={{ width: "100%", marginTop: 32, paddingTop: 16, borderTop: "1px solid hsl(var(--border))" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", justifyContent: "center", fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>
            <Link href="#" style={{ color: "inherit" }}>AGB</Link>
            <Link href="#" style={{ color: "inherit" }}>Datenschutzerklärung</Link>
            <Link href="#" style={{ color: "inherit" }}>Impressum</Link>
            <Link href="#" style={{ color: "inherit" }}>Nutzungsbedingungen</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { LoginScreen });
