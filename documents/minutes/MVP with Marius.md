feedback from marius:
- database feedback: get deployment up
- algorithm feedback: not moving boxes straight to the ground to dec total energy needed to move
- encourages us to work with the deployed version early on so we can all work on that system. running algorithms overnight once scenarios scale up
  - once all set up, wants to see an analysis of the system
  - capture status from our perspective
  - document and describe features, adv, dis well
  - then can clearly present advancements to make sure our contributions can be seen
- capture the initial system, test and review it 
- ui feedback: visually very rapid, 
      visual overload to users,
      maybe make movement lazy loading so camera moves slowly and continuously
      write a document of the features you are thinking about 
        and giving priorities on the most impactful feature
      its about quality of features not number of features
      feature ideas: 
                on previous system didn't find it too intuitive where the results are and how to coompare them
      keeping as minimalistic as possible - be careful about number of features added
      display overview of all the algorithms and compare them
- foundational review of last years platform to show improvements - have a clear plan of which month we focus on what and priorities



- direction/ insight on benchmarking: total number of moves - that target box needs to execute 
                                      plus other boxes that needed to move, ratio of target box to other box moves
                                      - energy - eg horizontal move costs 1 unit and vertical costs 2
- real-world contraints and what else he'd like: further down line once we've documented and reviewed current system
                                                - warehouse size: visual walls, pillars, obstacles to avoid, areas boxes can stack
                                                  also dynamic abstacles
                                                - total stacking height of boxes ~20 boxes as a limiting factor
                                                - number of boxes that can be above one vertically moving
                                                  might only be able to lift itself plus 4 on top
                                                - entries and exits of warehouse etc
                                                - parallel executions of multiple boxes moving at the same time, making them consider eachother - verification
