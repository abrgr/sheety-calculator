# Sheety App
[Sheety App](http://www.sheetyapp.com) is a suite of tools for building apps out of spreadsheets.  These aren't static, single-user apps though.  This is the real deal.  Multiple screens with arbitrarily complex navigation, authentication, user data storage, aggregate user data... we'll even generate an API from your sheets.

Since you're here looking at this code, you're probably thinking: "This sounds great for a prototype but how the heck am I going to maintain and enhance this thing?"  Well, we focus on simplicity and modularity... and you're reading the code!  We have the following modules:
 - Sheety Model - provides model types used in other modules
 - Sheety Modeler - generates a declarative model from a spreadsheet
 - *Sheety Calculator* - accepts that model and a current state, runs all modeled calculations, and generates the new state of every cell
 - Sheety App - React component that takes the model and, using the Sheety Calculator, renders the app, handling user data updates, authentication, aggregate data retrieval, etc.
 - Sheety API - hosted API layer that accepts user data updates and serves results from the Sheety Calculator

So... how do you maintain and extend this thing?  You have options.  From least to most work:
 - Wrap the Sheety App components to change styling, integrate into existing apps, or inject your own functionality.
 - Hit the Sheety API from your custom frontend to use Sheety as a serverless provider that turns your business people into the most competent backend engineers you've ever met.
 - Wrap the Sheety Calculator to let your business people write your business rules and logic and free you to write everything else.

# License
THIS IS NOT OPEN SOURCE.
We provide this code to allow our sheetyapp.com clients to see exactly what powers their apps and to extend them as needed.

# Local Development
## Install dependencies
```bash
  docker-compose run --rm sheety-app yarn install --frozen-lockfile
```

## Test
```bash
  docker-compose run --rm sheety-app npm test
```

## Add dependencies
```bash
  docker-compose run --rm sheety-app yarn add <dependency>
```

## Build for production
``` bash
  docker-compose run --rm sheety-app npm run build
```

## Everything else
This project was bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app).
Find the most recent version of the Create React App local development guide [here](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md).
