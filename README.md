![XJTUTennis](./client/src/assets/regular-no-gradient-8x.png#gh-light-mode-only)
![XJTUTennis](./client/src/assets/dark-logo-8x.png#gh-dark-mode-only)

# XJTUTennis, A Platform for Automatic XJTU Sport Court Booking


> 
> ### Notice
>
> To guarantee the efficiency of platform, the core court reserver part `court_reserver` is **NOT** open sourced.
>
> However, you can write your own reserver as long as it meets the API requirements.


## Quickstart (Temporary)

```bash
./init.sh
# Also edit `user_data.csv` and append lines for accounts:
#     username,password,NetId,NetId Password
# Example:
#     foo,my_password,3124100000,netid_password
# Start server:
go run . http://202.117.17.144:8071/

# On another terminal,
# Start frontend development server
cd client
npm install
npm run dev
```
