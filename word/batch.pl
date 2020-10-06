#!/usr/bin/env perl
use strict;
use warnings;
use utf8;
use feature 'say';
use File::Spec::Functions 'catfile';
use  File::Path 'make_path';
use File::Basename;
binmode(STDOUT, ":unix:utf8");


open(FH, '>', "processing-log.txt") or die $!;

opendir my $dir, "docx" or die "Cannot open directory: $!";
my @files = readdir $dir;
closedir $dir;
foreach my $dx (@files) {
	# say $dx;
	if ($dx =~ m/^CIR(\d+)\s+v\.\s*(\d+)\s+([A-Z]+)(.*)$/){
		print FH $1."\t".$2."\t".$3."\t[".$dx."]\n";
		doStuff($dx, $1);
		# print FH $4."\n"
	} elsif(length($dx) > 2) {
		say STDERR "!!! ". $dx;
	}
}



close(FH);

sub preparePath{
	my ($path) = @_;
	my ($name,$dir,$suffix) = fileparse($path);
	make_path($dir) unless (-e $dir);
}

sub doStuff {
	my ($fn, $nfn) = @_;
	my $path_in = File::Spec->rel2abs(catfile("docx", $fn));
	(my $fn_noext = $fn) =~ s/\.[^.]+$//;
	my $path_html = File::Spec->rel2abs(catfile("data", $fn_noext.".html"));
	my $path_desc = File::Spec->rel2abs(catfile("data", $fn_noext.".txt"));
	# $path_in =~ s/\\/\//g;
	# $path_out =~ s/\\/\//g;
	my $cmd2html = 'perl epi-word-to-html.pl "'.$path_in.'" "'.$path_html.'"';
	say $cmd2html;
	preparePath($path_html);
	system($cmd2html);
	my $cmd2xml = 'perl epi-strip-html.pl "'.$path_html.'" "'.$path_desc.'"';
	say $cmd2xml;
	preparePath($path_desc);
	system($cmd2xml);
	
	say ("#" x 120);
	# exit

	# if (-e $path_in) {
		# print "the file exists\n";
	# } 
	# exit
}
