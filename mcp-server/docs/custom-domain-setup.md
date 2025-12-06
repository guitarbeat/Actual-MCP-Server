# Custom Domain Setup for MCP Server

## Setting Up `actual-mcp.alw.lol`

### Step 1: DNS Configuration (Namecheap)

1. **Go to Namecheap DNS Management**
2. **Add A Record:**
   - **Host:** `actual-mcp` (or `@` if you want `alw.lol` itself)
   - **Type:** A Record
   - **Value:** `64.181.223.201` (your Easy Panel server IP)
   - **TTL:** Automatic (or 300 seconds)

**Result:** `actual-mcp.alw.lol` → `64.181.223.201`

### Step 2: Easy Panel Configuration

1. **Go to Easy Panel** → Your Project → `actualbudget-mcp` service
2. **Click on "Domains" or "Settings"**
3. **Add Custom Domain:**
   - **Host:** `actual-mcp.alw.lol`
   - **HTTPS:** Enabled (Easy Panel will auto-generate SSL certificate)
   - **Port:** 3000
   - **Path:** `/`
   - **Internal Protocol:** `http`

4. **Save and wait for SSL certificate** (usually takes a few minutes)

### Step 3: Verify DNS Propagation

```bash
# Check if DNS is resolving
dig actual-mcp.alw.lol
# or
nslookup actual-mcp.alw.lol

# Should return: 64.181.223.201
```

### Step 4: Test the Domain

```bash
# Test HTTP (should redirect to HTTPS)
curl -I http://actual-mcp.alw.lol

# Test HTTPS
curl https://actual-mcp.alw.lol/
```

## Important Notes

### DNS Propagation Time
- Can take 5 minutes to 48 hours
- Usually works within 15-30 minutes
- Use `dig` or `nslookup` to check

### SSL Certificate
- Easy Panel uses Let's Encrypt
- Auto-generates when domain is added
- May take a few minutes to provision
- Check Easy Panel for certificate status

### Port Configuration
- Easy Panel will route `actual-mcp.alw.lol` → internal port 3000
- No changes needed to your `PORT=3000` environment variable
- Traefik handles the routing automatically

## Troubleshooting

### DNS Not Resolving
- Wait for propagation (check with `dig`)
- Verify A record is correct in Namecheap
- Check for typos in domain name

### SSL Certificate Issues
- Wait a few minutes for Let's Encrypt
- Check Easy Panel certificate status
- Verify domain is accessible via HTTP first

### Domain Not Working
- Verify DNS points to correct IP (`64.181.223.201`)
- Check Easy Panel domain configuration
- Verify port 3000 is exposed
- Check service is running

## After Setup

Once `actual-mcp.alw.lol` is working, you can:
- Update any clients to use the new domain
- The old domain (`personal-actualbudget-mcp.imklj5.easypanel.host`) will still work
- You can remove the old domain if desired
