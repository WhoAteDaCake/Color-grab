#!/bin/bash

git add --all 
wait
git commit --all
wait

if [ $# -ge 1 ] && [ $1 = "push" ] ; then
	if [ $# -eq 1 ]; then
		git push origin master
	else
		git push $2 $3;
	fi

fi
