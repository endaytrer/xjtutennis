![XJTUTennis](./client/src/assets/regular-no-gradient-8x.png#gh-light-mode-only)
![XJTUTennis](./client/src/assets/dark-logo-8x.png#gh-dark-mode-only)

# XJTUTennis, A Platform for Automatic XJTU Sport Court Booking


> 
> ### Notice
>
> To guarantee the efficiency of platform, the core court reserver part `court_reserver` is **NOT** open sourced,
> and is an additional plugin of the platform.
> You can still run the program without the plugin, but no courts will be reserved, only showed on UI.
>
> You can write your own reserver as long as it meets the API requirements as in
> https://github.com/endaytrer/court_reserver_interface.


## Quickstart (Temporary)

```bash
./init.sh
# Also edit `user_data.csv` and append lines for accounts:
#     username,password,NetId,NetId Password
# Example:
#     foo,my_password,3124100000,netid_password
# Start server without reserver plugin:
go run .
# Or, start a server with reserver plugin:
go run . -reserver-plugin /path/to/court_reserver.so -challenge-url http://202.117.17.144:8071/

# On another terminal,
# Start frontend development server
cd client
npm install
npm run dev
```
