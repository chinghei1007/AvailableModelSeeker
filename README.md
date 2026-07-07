# AvailableModelSeeker
A super duper simple little program, using node js, and python, to see a particular servver or openAI compatible link provide what model, and can be expanded as needs increase

`npm install` and `npm run start` for running the program on html, where it will export a csv in list automatically on the available models

For exe (Python built), look into `/dist` folder.

Rebuild the exe using 

```py
pyinstaller availableModelsFetcher.spec
# --or--
pyinstaller --onefile pythonBuild/availableModelsFetcher.py
```