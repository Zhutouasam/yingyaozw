import React from 'react'
import { mountApp } from './mount-app.jsx'
import Home from './home.jsx'

const container = document.getElementById('root')
mountApp(<Home />, { hydrate: !!container.querySelector('.home-shell') })
