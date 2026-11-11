import React from 'react'
import { renderToString } from 'react-dom/server'
import Home from './home.jsx'

export function renderHome() { return renderToString(<Home/>) }
