Present: Cassie, Freya, Timmy, Raymond, (Ashby)

Adding scenarios: 
- Python script, somewhere - he doesn't know where. Recommends this over making it through the json
Feedback on ideas: 
- Issue with several boxes entering, maybe make the algorithm request the next box, and then it enters.
- Need to find a way to tell the algorithm a box is entering the warehouse.

Making algorithm design easier:
- Security issues, what if dodgy code is run on the backend? 
- Idea: Keep most code closed source, make the algorithm client open source so users can use it to write algorithms 
- Question on how much benefit a way to write code on the actual website would bring 
- Marius probably wants it to stay open source

Algorithm packaged like fill-remove is not required, but it does give a way to structure it. 

What Asbhy had ideas for from last year:
Algorithm client needs python, people might want to use other languages - Look at how any websocket could send messages to be an algorithm client.
Document how the python one works, so people could use another language to make one. 

AWS issues:
- Token refreshes, need to ask Sarah to get AWS credentials so this doesn't happen
- Last year used terraform, we're doing it directly on AWS

Playground:
- Improvements to be made, transparent boxes a good idea. 

Testing:
- Last year focused on feedback for the playground on user testing day
- The git workflows are already running tests - lots of tests make sure it rejects invalid moves 
- No frontend tests exist so far
- Write new tests for new algorithms 
- Tests may not have been running before as we hadn't pulled directory out 
