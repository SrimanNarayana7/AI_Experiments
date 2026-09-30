export const SAMPLE_HTML = `<form class="login-form" data-testid="login-form">
  <h1>Sign in</h1>
  <label for="email">Email address</label>
  <input id="email" name="email" type="email" placeholder="you@example.com" data-testid="email-input" />

  <label for="password">Password</label>
  <input id="password" name="password" type="password" placeholder="Enter password" data-testid="password-input" />

  <div class="actions">
    <button type="submit" data-testid="login-button">Login</button>
    <a href="/forgot" class="link">Forgot password?</a>
  </div>

  <div class="options">
    <input type="checkbox" id="remember" name="remember" />
    <label for="remember">Remember me</label>
  </div>
</form>

<nav class="navbar" role="navigation" aria-label="Main">
  <a href="/home">Home</a>
  <a href="/products">Products</a>
  <button class="nav-search" aria-label="Search">Search</button>
</nav>

<select id="country" name="country" aria-label="Country">
  <option value="us">United States</option>
  <option value="in">India</option>
</select>`;
