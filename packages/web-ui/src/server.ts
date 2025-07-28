import { createStartHandler } from '@tanstack/react-start/server'
import { createClerkHandler } from '@clerk/tanstack-react-start/server'

export default createClerkHandler(createStartHandler())

