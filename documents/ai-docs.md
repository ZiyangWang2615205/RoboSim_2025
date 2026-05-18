# AI Tools #
We declare that any and all AI usage within the project has been recorded and noted below. 
This includes (but is not limited to) usage of text generation
methods, including LLMs, text summarisation methods, or image generation methods.
We understand that failing to divulge the use of AI within our work counts as contract cheating and can result in a zero mark for SEP.

## Project AI ##

### AI integrated into the project ###
No AI models or LLMs are integrated directly into the final software product or its runtime features. AI was used strictly as an assistive tool during the development, debugging, and reviewing phases.

### AI used for Development ###
Models used: ChatGPT and Google Gemini
How it was used: 
- Syntax and language support: used to clarify syntax across various languages including TypeScript, HTML, CSS, Three.js, Python and SQL.
- Database migration: Both ChatGPT and Gemini were used to help with the migration from SQLite to PostgreSQL. This included researching differences in parameter passing, asynchronous calls (await) and generating efficient JSON conversion commands for specific features like "exit zones."
- Infrastructure setup: ChatGPT was used Nginx server configurations and to assist with virtual environment setup commands.
- Algorithmm logic (attempted): Gemini Pro was tested to assist with the logic of box movement algorithms (Type 2 boxes), though concluded AI wasn't suited for the complex spatial logic.

### AI used for Debugging ###
Models used: ChatGPT and Google Gemini
How it was used:
- Server and deployment issues: ChatGPT was used to debug Docker log commands and trace the root cause of '502 Bad Gateway' server errors.
- Database debugging: Gemini and ChatGPT were used to scan existing database handlers to identify SQLite-specific code that needed replacing. Gemini was also used to spot PostgreSQL-specific syntax errors (e.g mistaking ? for $1 in UPDATE/SELECT statements).
- Last years code: ChatGPT was used to debug old code from previous years work to ensure features like "transparent boxes" ran without errors.

### AI used for Reviewing ###
Models used: ChatGPT
How it was used:
- Understanding last years code: ChatGPT was used as a review tool to scan blocks of uncommented code, explain their structure and summarise what specific functions and features they were responsible for.

## Personal AI ##

### Mincheol ###
I, Mincheol, declare that this document is accurate to my AI usage throughout the course of SEP.

#### Development ####
I used ChatGPT to check the syntax and general information of typeScript, html, css, Three.js
Some existing function and types were need to be used to implement features. 

#### Debugging ####
I used ChatGPT to debug some code lines were commented by last year works, I needed to use them for transparent box feature.
Thus, debug them to check that it works properly without causing errors. 

#### Reviewing ###
I used ChatGPT to organise the structure which block of codes are working for and features.
There are a lot of codes from last year project and some codes had no specific comments what they are doing, thus I needed to review and understand.

-------------------------
 
### Ziyang ###
I, Ziyang, declare that this document is accurate to my AI usage throughout the course of SEP.

#### Development ####
Ziyang used gpt to write configuration of Nginx which save his time to build the whole server.
Ziyang used ai to create a new project architecture graph.
Ziyang used gpt to gain command so that he could check whether the path of venv is true.
I used ChatGpt to help me finish parts of Nginx configuration, for example, error log and access log codes are made by Gpt.
In summary, I wrote the architecture of configuration and send it to Gpt which helped to check and make whole configuration more comprehensively.


#### Debugging ####
Ziyang used gpt to help himself to detect the problem of server, 502 bad gateway.
I used ChatGpt to help locate the issue of 502 bad gateway. Because I forget the log print command of docker stuff.
#### Reviewing ###

-------------------------
 
### Freya ###
I, Freya, declare that this document is accurate to my AI usage throughout the course of SEP.

#### Development ####
When migrating the new database to PostgreSQL, I used Google Gemini to research syntax differences between their existing SQLite database and the new PostgreSQL databse.
Some example prompts looked like:
What is the PostgreSQL equivalent to SQLites INSERT OR REPLACE sql statement?
Whats the equivalent PostgreSQL command for the '?' in SQLite3?
By using these research prompts, I was able to learn the differences in syntax and make the correct updates to the code.

When testing my benchmarking page, I used Google Gemini to learn how to a provide fake JSON response to test my UI.
I ran this prompt:
How can I intercept a network fetch request in typescript to provide fake JSON response to test the UI of my webpage?
The AI helped me learn how to correctly write the tests to test edge cases with fake data.

#### Debugging ####
I used Google Gemini to debug a git merge conflict. 
I had added and deleted a load of files and lines of code but an error occured because i forgot to pull on the specific branch first but couldn't just delete what I'd done, run 'git pull' and and copy the work again. 
I ran this prompt:
 ! [rejected]        documentation -> documentation (fetch first)
error: failed to push some refs to 'github.com:spe-uob/2025-RoboSim.git' 
I forgot to run 'git pull on the documentation branch before making changes, how to fix this error? 
By running this prompt, I managed to fetch the other changes and commit mine succesfully without any loss of changes.

I used Google Gemini to see what code was sqlite specific, so I knew what code to edit vs which was good to leave as is.
I found this really helpful as there was a lot of errors occuring when migrating the database and I was not familiar with SQLite vs PostgreSQL migration.

I used Google Gemini to spot where my PostgreSQL syntax error was in my SQL UPDATE and SELECT statements. I had already designed the schema changes and knew exactly what data needed to be saved but kept running into an error with it. I pasted my UPDATE and SELECT statements and it spotted I had accidentslly used SQLites '?' instead of PostgreSQLs '$1' for variables and I had left a trailing comma.

#### Reviewing ### 
I used Google Gemini to understand complex parts of the code when getting to grips with the existing Robosim codebase. 
If I encountered a function I couldn't understand, I would paste it into AI and run a prompt like "Can you explain step by step what this typescript function is doing?"
This allowed me to confidently review the code and understand how it all works.

-------------------------
 
### Cassie ###
I, Cassie, declare that this document is accurate to my AI usage throughout the course of SEP.

#### Development ####
I used ChatGPT to research  general information on how code for PostgreSQL should differ from that of SQLite
An example was to work out how passing parameters differed between PostgreSQL and SQLite, and learning that database calls need to use await a lot more in PostgreSQL, as it's not as synchronous.
I used ChatGPT while creating exit zones to find a shorter command to turn all parameters to/from JSON rather than listing each individually, for efficiency. 

I used ChatGPT while looking into the exit zones frontend to explain what existing functions in start-end-cube.ts do, so I could judge if they were suitable to replicate for the exit zones.  For example, a prompt I used: "What does this do? this.endInstanceMesh = new THREE.InstancedMesh( geometry, endMaterial, count );" where it then explained I would need to define how many of the cubes I would be creating as part of that function. I ended up not using an InstancedMesh and instead using just a Mesh since it would be more efficient to render one box as the exit zone rather than potentially hundreds. 

#### Debugging ####
I used ChatGPT to scan the database handler to see what code was SQLite-specific, so I knew what code to edit vs which was good to leave as is. I did this as I was not familiar with either database type (SQLite/PostgreSQL), so I didn't know where to start changing anything.
I attempted to use ChatGPT to debug the frontend of exit zones when I couldn't find the issue myself by getting it to check sections of code. However, it wasn't helpful, and I ended up finding the issue myself. 

#### Reviewing ###
I used ChatGPT to explain what lots of functions in the existing codebase did throughout the project, as the code from previous years was lacking in comments in many areas. 

-------------------------
 
### Raymond ###
I, Raymond, declare that this document is accurate to my AI usage throughout the course of SEP.

#### Development ####
### Example 1:
Task: Algorithm Development 
Tools: Gemini Pro
During the development of the Type 2 Algorithm, I attempted to use Gemini Pro to aid me with the logic of the box movements. This included giving it context on how Type 2 boxes worked. 
## An example prompt would include: 
"displace_legs(id) + extend_legs(id): This command sequence moves Box id AND the entire stack of boxes on top of it UP by one unit.
its not quite that simple. imagine a stack of 2 boxes. if the bottom box were to displace and extend it's legs, the stack would move up with an empty space on the ground. if the top box were to displace and extend legs, the stack would remain the same height but the bottom box would be able to move and leave a space behind (the top box can now also retract it's legs, which would make the stack just one box). do you understand now?"

After experimenting with similar prompts, I found that the AI simply didn't understand the context and wouldn't provide any useful insight on the logic of how the algorithm should run. I then stopped using AI for logic and more to fill technical gaps in my knowledge, as I will demonstrate in the next example.

### Example 2:
Task: Algorithm Development 
Tools: Gemini Pro
An example of how I query AI to help me fill gaps in my coding knowledge is to get it to explain, in-depth, the difference between using 2 different functions in python.
## An example prompt would include: 
"req = next(iter(scenario.requirements), None)

explain the difference between using a for loop and using next in this context"

The AI will then give me a detailed breakdown of how the logic works, providing examples with dummy data, which really my understanding and means I can write the best code for a specific sub-task. 


#### Debugging ####
### Example 1:
Task: Trying to commit new documentation changes
Tools: Gemini Pro
I use AI quite heavily when working in my terminal to quickly debug problems that I run into. 
"ive just realised that documentation is behind dev, what do i do now"
Even though I could answer this question through Google, AI usually gives me a very direct and clear explanation of what I can do, and how to fix my mistakes when I'm using git.

### Example 2:
Task: Setting up new database
Tools: Gemini Pro
When using the terminal to do things like setting up the new database, I can quite easily run into problems. AI helps me debug these very quickly - I simply give it the terminal output/error codes and it explains what steps I neeed to take.
This is where AI probably helps me the most, as when setting things up in the terminal, there are often very niche, sometimes platform specific problems, that I can run into. AI helps me debug these a lot faster than if I would use a search engine. I could save an hour on a relatively simple fix that I might not have found the solution to quickly, especially when I am using new technologies I am not used to.

#### Reviewing ###
